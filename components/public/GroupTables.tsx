"use client";

import React from "react";

interface GroupTablesProps {
  groupTables: {
    groupA: string[];
    groupB: string[];
  } | null;
}

export const GroupTables: React.FC<GroupTablesProps> = ({ groupTables }) => {
  if (!groupTables || !groupTables.groupA || !groupTables.groupB || (groupTables.groupA.length === 0 && groupTables.groupB.length === 0)) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold mb-4 text-yellow-900">🟨 Таблиці змагань</h2>
        <p className="text-gray-600">Дані груп ще не додані</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-8">
      <h2 className="text-xl font-bold mb-6 text-yellow-900">🟨 Таблиці змагань</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Група A */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-yellow-800">Група A</h3>
          <div className="bg-white border-2 border-yellow-300 rounded-lg p-4">
            {groupTables.groupA.length > 0 ? (
              <ol className="space-y-2">
                {groupTables.groupA.map((team, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    <span className="font-bold text-yellow-700">{idx + 1}.</span> {team}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 text-sm">Команди не додані</p>
            )}
          </div>
        </div>

        {/* Група B */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-yellow-800">Група B</h3>
          <div className="bg-white border-2 border-yellow-300 rounded-lg p-4">
            {groupTables.groupB.length > 0 ? (
              <ol className="space-y-2">
                {groupTables.groupB.map((team, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    <span className="font-bold text-yellow-700">{idx + 1}.</span> {team}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 text-sm">Команди не додані</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupTables;
