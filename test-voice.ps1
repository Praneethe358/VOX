# ─── MindKraft Voice Test (Terminal) ────────────────────────────────────────
# Records audio from your mic, sends to Whisper STT, displays result.
# Also tests TTS by speaking text through the backend.
#
# Usage:
#   .\test-voice.ps1              # Record 5s, send to STT
#   .\test-voice.ps1 -Seconds 8   # Record 8s
#   .\test-voice.ps1 -TTS "Hello" # Test TTS only
#   .\test-voice.ps1 -Loop        # Continuous STT loop
# ────────────────────────────────────────────────────────────────────────────

param(
    [int]$Seconds = 5,
    [string]$TTS = "",
    [switch]$Loop,
    [string]$MicName = "Microphone Array (Senary Audio)",
    [string]$Backend = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Write-Color($text, $color) { Write-Host $text -ForegroundColor $color }

function Test-Backend {
    try {
        $r = Invoke-WebRequest -Uri "$Backend/health" -UseBasicParsing -TimeoutSec 3
        $j = $r.Content | ConvertFrom-Json
        if ($j.status -eq "ok") { return $true }
    } catch {}
    return $false
}

function Record-Audio($outPath, $durationSec) {
    Write-Color "`n🎤  RECORDING for $durationSec seconds — speak now!" Yellow
    Write-Host "    (Press Ctrl+C to cancel)"
    
    $ffArgs = @(
        "-y", "-f", "dshow",
        "-i", "audio=$MicName",
        "-t", "$durationSec",
        "-ar", "16000", "-ac", "1", "-sample_fmt", "s16",
        "-f", "wav", $outPath
    )
    
    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $ffArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\ffmpeg_err.txt"
    
    if ($proc.ExitCode -ne 0) {
        $err = Get-Content "$env:TEMP\ffmpeg_err.txt" -Raw -ErrorAction SilentlyContinue
        Write-Color "  ✗ Recording failed (exit $($proc.ExitCode))" Red
        if ($err) { Write-Host "    $($err.Substring([Math]::Max(0, $err.Length - 300)))" -ForegroundColor DarkGray }
        return $false
    }
    
    $size = (Get-Item $outPath).Length
    Write-Color "  ✓ Recorded: $([math]::Round($size/1024, 1)) KB" Green
    return $true
}

function Send-STT($audioPath, $endpoint) {
    Write-Color "  ⏳ Sending to Whisper ($endpoint)..." Cyan
    
    $uri = "$Backend/api/ai/$endpoint"
    
    # Build multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($audioPath)
    $fileName = [System.IO.Path]::GetFileName($audioPath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"audio`"; filename=`"$fileName`"",
        "Content-Type: audio/wav",
        ""
    )
    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes(($bodyLines -join "`r`n") + "`r`n")
    $footerBytes = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
    
    $bodyStream = New-Object System.IO.MemoryStream
    $bodyStream.Write($headerBytes, 0, $headerBytes.Length)
    $bodyStream.Write($fileBytes, 0, $fileBytes.Length)
    $bodyStream.Write($footerBytes, 0, $footerBytes.Length)
    $bodyArray = $bodyStream.ToArray()
    $bodyStream.Dispose()
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyArray -UseBasicParsing -TimeoutSec 120
        $json = $response.Content | ConvertFrom-Json
        $data = $json.data
        $text = $data.text
        $confidence = $data.confidence
        
        if ($text -and $text.Trim().Length -gt 0) {
            Write-Host ""
            Write-Color "  ╔══════════════════════════════════════════════════╗" Green
            Write-Color "  ║  WHISPER HEARD:                                 ║" Green
            $padded = "  ║  `"$text`"".PadRight(52) + "║"
            Write-Color $padded White
            $confStr = "  ║  Confidence: $([math]::Round($confidence * 100, 1))%".PadRight(52) + "║"
            Write-Color $confStr DarkGray
            Write-Color "  ╚══════════════════════════════════════════════════╝" Green
        } else {
            Write-Color "  ⚠ Whisper returned empty — no speech detected" Yellow
            Write-Color "    (confidence: $([math]::Round($confidence * 100, 1))%)" DarkGray
        }
        
        return $text
    } catch {
        Write-Color "  ✗ STT request failed: $($_.Exception.Message)" Red
        return $null
    }
}

function Test-TTS($text) {
    Write-Color "`n🔊  Testing TTS: `"$text`"" Cyan
    
    $body = @{ text = $text; speed = 150; voice = "en-us" } | ConvertTo-Json
    $outWav = Join-Path $env:TEMP "mindkraft_tts_test.wav"
    
    try {
        $response = Invoke-WebRequest -Uri "$Backend/api/ai/tts-speak" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 30 -OutFile $outWav
        $size = (Get-Item $outWav).Length
        Write-Color "  ✓ TTS returned $([math]::Round($size/1024, 1)) KB audio" Green
        
        # Play it
        Write-Color "  ▶ Playing..." Yellow
        $player = New-Object System.Media.SoundPlayer($outWav)
        $player.PlaySync()
        $player.Dispose()
        Write-Color "  ✓ Playback complete" Green
    } catch {
        Write-Color "  ✗ TTS failed: $($_.Exception.Message)" Red
        Write-Color "    (This is OK — the app uses browser TTS now, not backend espeak)" DarkGray
    }
}

# ─── Command matching (mirrors frontend logic) ────────────────────────────
$COMMANDS = @{
    "start exam"       = "start_exam"
    "start answering"  = "start_answering"
    "stop dictating"   = "stop_dictating"
    "done"             = "stop_dictating"
    "next question"    = "next_question"
    "next"             = "next_question"
    "previous question"= "previous_question"
    "previous"         = "previous_question"
    "back"             = "previous_question"
    "repeat question"  = "repeat_question"
    "repeat"           = "repeat_question"
    "option 1"         = "option_1"
    "option one"       = "option_1"
    "option 2"         = "option_2"
    "option two"       = "option_2"
    "option 3"         = "option_3"
    "option three"     = "option_3"
    "option 4"         = "option_4"
    "option four"      = "option_4"
    "submit exam"      = "submit_exam"
    "submit"           = "submit_exam"
    "confirm submission" = "confirm_submission"
    "read my answer"   = "read_my_answer"
    "clear answer"     = "clear_answer"
    "pause exam"       = "pause_exam"
    "pause"            = "pause_exam"
    "resume exam"      = "resume_exam"
    "resume"           = "resume_exam"
    "i'm ready"        = "im_ready"
    "ready"            = "im_ready"
    "confirm answer"   = "confirm_answer"
}

function Match-Command($text) {
    if (-not $text) { return $null }
    $norm = $text.ToLower() -replace "[^\w\s]", "" | ForEach-Object { $_.Trim() }
    
    # Exact match
    if ($COMMANDS.ContainsKey($norm)) {
        return $COMMANDS[$norm]
    }
    
    # Contains match
    foreach ($phrase in $COMMANDS.Keys) {
        if ($norm -like "*$phrase*") {
            return $COMMANDS[$phrase]
        }
    }
    
    return $null
}

# ─── Main ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Color "╔══════════════════════════════════════════════════════╗" Cyan
Write-Color "║     MindKraft Voice Test (Terminal)                  ║" Cyan
Write-Color "║     Mic: $($MicName.Substring(0, [Math]::Min($MicName.Length, 35)))".PadRight(56) + "║" Cyan
Write-Color "╚══════════════════════════════════════════════════════╝" Cyan

# Check backend
Write-Host "`nChecking backend..." -NoNewline
if (-not (Test-Backend)) {
    Write-Color " ✗ Backend not running at $Backend" Red
    Write-Host "Start it with: cd Team-A-Backend/Team-A-Backend && node dist/server/standalone.js"
    exit 1
}
Write-Color " ✓ Backend healthy" Green

# TTS-only mode
if ($TTS) {
    Test-TTS $TTS
    exit 0
}

# STT mode
$wavPath = Join-Path $env:TEMP "mindkraft_stt_test.wav"

if ($Loop) {
    Write-Color "`n── CONTINUOUS LOOP MODE (Ctrl+C to stop) ──" Yellow
    $round = 0
    while ($true) {
        $round++
        Write-Color "`n━━━ Round $round ━━━" Magenta
        
        if (Record-Audio $wavPath $Seconds) {
            $text = Send-STT $wavPath "stt-command"
            
            if ($text) {
                $cmd = Match-Command $text
                if ($cmd) {
                    Write-Color "  → COMMAND MATCHED: $cmd" Magenta
                } else {
                    Write-Color "  → No command match (try: 'next question', 'option 1', 'submit exam', etc.)" DarkYellow
                }
            }
        }
        
        Start-Sleep -Seconds 1
    }
} else {
    # Single recording
    if (Record-Audio $wavPath $Seconds) {
        $text = Send-STT $wavPath "stt-command"
        
        if ($text) {
            $cmd = Match-Command $text
            if ($cmd) {
                Write-Color "`n  → COMMAND MATCHED: $cmd ✓" Magenta
            } else {
                Write-Color "`n  → No command match" DarkYellow
                Write-Host "    Try saying: 'next question', 'option 1', 'submit exam', 'start answering'"
            }
        }
    }
    
    Write-Host "`nTip: Run with -Loop for continuous testing, or -TTS `"text`" to test speech output"
}
