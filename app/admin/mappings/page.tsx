'use client';

import { useState, useEffect } from 'react';

interface InstagramWalletMapping {
  id: string;
  instagramUsername: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function MappingsPage() {
  const [mappings, setMappings] = useState<InstagramWalletMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/instagram-wallet?all=true');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMappings(data.mappings);
        } else {
          setError(data.error || 'Failed to fetch mappings');
        }
      } else {
        setError('Failed to fetch mappings');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const testDatabase = async () => {
    try {
      const response = await fetch('/api/test-mapping');
      const data = await response.json();
      if (data.success) {
        alert(`Database test successful! Mapping count: ${data.mappingCount}`);
      } else {
        alert(`Database test failed: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to test database');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Instagram to Wallet Mappings
          </h1>

          {/* Test Database Button */}
          <div className="mb-6">
            <button
              onClick={testDatabase}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Test Database Connection
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {mappings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No mappings found. This could mean:
              </p>
              <ul className="text-gray-500 mt-2 space-y-1">
                <li>• No users have connected their Instagram and wallet yet</li>
                <li>• The database connection is not working</li>
                <li>• The mappings table hasn't been created yet</li>
              </ul>
              <div className="mt-4">
                <button
                  onClick={fetchMappings}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instagram Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings.map((mapping) => (
                    <tr key={mapping.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        @{mapping.instagramUsername}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {mapping.walletAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapping.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapping.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
