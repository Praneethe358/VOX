import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/student/api.service';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [speechRate, setSpeechRate] = useState(1);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await apiService.getStudentProfile();
      const profile = response.data?.student;
      if (profile?.accessibilityProfile) {
        setLanguage(profile.accessibilityProfile.preferredLanguage || 'en');
        setSpeechRate(profile.accessibilityProfile.speechRate || 1);
      }
    };

    loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg"
          >
            Back
          </button>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-slate-300 mb-2">Preferred Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Speech Rate: {speechRate.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <p className="text-slate-400 text-sm">
            Profile preference updates require backend save support and will sync automatically once endpoint is available.
          </p>
        </div>
      </div>
    </div>
  );
}
