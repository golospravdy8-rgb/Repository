'use client';

import { useState, FormEvent } from 'react';

interface AddTeamResponse {
  success: boolean;
  data?: {
    id: number;
    name: string;
    description: string | null;
    photo_url: string | null;
    created_at: string;
  };
  error?: string;
  details?: string;
  message?: string;
}

export default function AddTeam() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/teams/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          photoUrl: photoUrl.trim() || null,
        }),
      });

      const data: AddTeamResponse = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Team "${data.data?.name}" added successfully!`,
        });
        // Clear form
        setName('');
        setDescription('');
        setPhotoUrl('');
      } else {
        setMessage({
          type: 'error',
          text: data.details || data.error || 'Failed to add team',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Add New Team
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Team Name */}
        <div>
          <label
            htmlFor="team-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Team Name *
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="team-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter team description (optional)"
            disabled={loading}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Photo URL */}
        <div>
          <label
            htmlFor="team-photo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Photo URL
          </label>
          <input
            id="team-photo"
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/team-photo.jpg (optional)"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                : message.type === 'error'
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Adding Team...' : 'Add Team'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> Make sure Supabase is configured with
          NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local
        </p>
      </div>
    </div>
  );
}
