import React from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
    leaderboard: LeaderboardEntry[];
    currentUserId: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard, currentUserId }) => {
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return '🥇';
            case 2:
                return '🥈';
            case 3:
                return '🥉';
            default:
                return `#${rank}`;
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'text-yellow-400';
            case 2:
                return 'text-gray-300';
            case 3:
                return 'text-orange-400';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Global Leaderboard</h2>
                <p className="text-gray-400 text-sm mt-1">
                    Top {leaderboard.length} financial champions
                </p>
            </div>

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Level
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                XP
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Streak
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {leaderboard.map((entry) => {
                            const isCurrentUser = entry.userId === currentUserId;
                            return (
                                <tr
                                    key={entry.userId}
                                    className={`${isCurrentUser
                                            ? 'bg-blue-500 bg-opacity-10 border-l-4 border-blue-500'
                                            : 'hover:bg-gray-750'
                                        } transition-colors`}
                                >
                                    {/* Rank */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                                            {getRankIcon(entry.rank)}
                                        </div>
                                    </td>

                                    {/* Username */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">
                                                    {entry.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-semibold text-white">
                                                    {entry.username}
                                                    {isCurrentUser && (
                                                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Level */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="inline-flex items-center justify-center bg-purple-500 bg-opacity-20 border border-purple-500 rounded-full px-3 py-1">
                                            <span className="text-purple-400 font-bold text-sm">
                                                Lv. {entry.level}
                                            </span>
                                        </div>
                                    </td>

                                    {/* XP */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-yellow-400 font-bold">
                                            {entry.xp.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">XP</div>
                                    </td>

                                    {/* Streak */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="inline-flex items-center gap-1">
                                            <span className="text-orange-400 text-lg">🔥</span>
                                            <span className="text-white font-semibold">
                                                {entry.streak}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {leaderboard.length === 0 && (
                <div className="px-6 py-12 text-center">
                    <p className="text-gray-400">No leaderboard data available yet.</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Start tracking your finances to appear on the leaderboard!
                    </p>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
