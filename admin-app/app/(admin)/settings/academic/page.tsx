"use client";

import { useState, useEffect } from "react";
import { ConfirmModal } from "@/components/ui";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface GradingPeriod {
  id: string;
  name: string;
  shortName: string;
  startDate: string;
  endDate: string;
  weight: number;
}

interface GradingScale {
  letter: string;
  minScore: number;
  maxScore: number;
  description: string;
  color: string;
}

interface AcademicSettings {
  currentAcademicYear: string;
  academicYears: AcademicYear[];
  gradingPeriods: GradingPeriod[];
  gradingScale: GradingScale[];
  passingGrade: number;
  attendanceRequired: number;
  maxAbsences: number;
  lateThreshold: number;
  classStartTime: string;
  classEndTime: string;
}

export default function AcademicSettingsPage() {
  const [settings, setSettings] = useState<AcademicSettings>({
    currentAcademicYear: "2024-2025",
    academicYears: [
      { id: "1", name: "2024-2025", startDate: "2024-08-05", endDate: "2025-05-30", isCurrent: true },
      { id: "2", name: "2023-2024", startDate: "2023-08-07", endDate: "2024-05-31", isCurrent: false },
      { id: "3", name: "2022-2023", startDate: "2022-08-08", endDate: "2023-06-02", isCurrent: false },
    ],
    gradingPeriods: [
      { id: "1", name: "First Quarter", shortName: "Q1", startDate: "2024-08-05", endDate: "2024-10-11", weight: 25 },
      { id: "2", name: "Second Quarter", shortName: "Q2", startDate: "2024-10-14", endDate: "2024-12-20", weight: 25 },
      { id: "3", name: "Third Quarter", shortName: "Q3", startDate: "2025-01-06", endDate: "2025-03-14", weight: 25 },
      { id: "4", name: "Fourth Quarter", shortName: "Q4", startDate: "2025-03-17", endDate: "2025-05-30", weight: 25 },
    ],
    gradingScale: [
      { letter: "A", minScore: 90, maxScore: 100, description: "Excellent", color: "#22c55e" },
      { letter: "B", minScore: 80, maxScore: 89, description: "Very Good", color: "#84cc16" },
      { letter: "C", minScore: 75, maxScore: 79, description: "Good", color: "#eab308" },
      { letter: "D", minScore: 70, maxScore: 74, description: "Passing", color: "#f97316" },
      { letter: "F", minScore: 0, maxScore: 69, description: "Failing", color: "#ef4444" },
    ],
    passingGrade: 75,
    attendanceRequired: 80,
    maxAbsences: 20,
    lateThreshold: 15,
    classStartTime: "07:30",
    classEndTime: "17:00",
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"years" | "grading" | "attendance" | "schedule">("years");
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: string; id: string } | null>(null);

  const [newYear, setNewYear] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/academic");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/academic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddYear = () => {
    if (!newYear.name || !newYear.startDate || !newYear.endDate) return;

    setSettings((prev) => ({
      ...prev,
      academicYears: [
        ...prev.academicYears,
        {
          id: Date.now().toString(),
          name: newYear.name,
          startDate: newYear.startDate,
          endDate: newYear.endDate,
          isCurrent: false,
        },
      ],
    }));

    setNewYear({ name: "", startDate: "", endDate: "" });
    setShowAddYearModal(false);
    setHasChanges(true);
  };

  const handleSetCurrentYear = (yearId: string) => {
    setSettings((prev) => ({
      ...prev,
      academicYears: prev.academicYears.map((year) => ({
        ...year,
        isCurrent: year.id === yearId,
      })),
      currentAcademicYear: prev.academicYears.find((y) => y.id === yearId)?.name || prev.currentAcademicYear,
    }));
    setHasChanges(true);
  };

  const handleDeleteYear = (yearId: string) => {
    setSettings((prev) => ({
      ...prev,
      academicYears: prev.academicYears.filter((year) => year.id !== yearId),
    }));
    setShowDeleteModal(null);
    setHasChanges(true);
  };

  const handleGradingPeriodChange = (id: string, field: keyof GradingPeriod, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      gradingPeriods: prev.gradingPeriods.map((period) =>
        period.id === id ? { ...period, [field]: value } : period
      ),
    }));
    setHasChanges(true);
  };

  const handleGradingScaleChange = (index: number, field: keyof GradingScale, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      gradingScale: prev.gradingScale.map((scale, i) =>
        i === index ? { ...scale, [field]: value } : scale
      ),
    }));
    setHasChanges(true);
  };

  const handleSettingChange = (field: keyof AcademicSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const tabs = [
    { key: "years", label: "Academic Years", icon: "calendar_today" },
    { key: "grading", label: "Grading System", icon: "grade" },
    { key: "attendance", label: "Attendance", icon: "event_available" },
    { key: "schedule", label: "Schedule", icon: "schedule" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Settings</h1>
          <p className="text-gray-500 mt-1">Configure academic year, grading, and attendance policies</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">warning</span>
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-lg">save</span>
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Current Academic Year Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-hover rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Current Academic Year</p>
            <h2 className="text-2xl font-bold mt-1">{settings.currentAcademicYear}</h2>
            <p className="text-white/80 text-sm mt-2">
              {settings.academicYears.find((y) => y.isCurrent)?.startDate} to{" "}
              {settings.academicYears.find((y) => y.isCurrent)?.endDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Current Period</p>
            <p className="text-lg font-semibold mt-1">
              {settings.gradingPeriods[1]?.name || "Second Quarter"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex gap-1 px-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "years" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Academic Years</h3>
                <button
                  onClick={() => setShowAddYearModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Add Year
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Academic Year</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Start Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">End Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settings.academicYears.map((year) => (
                      <tr key={year.id}>
                        <td className="py-3 px-4 font-medium text-gray-900">{year.name}</td>
                        <td className="py-3 px-4 text-gray-600">{year.startDate}</td>
                        <td className="py-3 px-4 text-gray-600">{year.endDate}</td>
                        <td className="py-3 px-4">
                          {year.isCurrent ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Current
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!year.isCurrent && (
                              <button
                                onClick={() => handleSetCurrentYear(year.id)}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                title="Set as Current"
                              >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                              </button>
                            )}
                            {!year.isCurrent && (
                              <button
                                onClick={() => setShowDeleteModal({ type: "year", id: year.id })}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grading Periods for Current Year */}
              <div className="mt-8">
                <h4 className="font-medium text-gray-700 mb-4">Grading Periods ({settings.currentAcademicYear})</h4>
                <div className="space-y-3">
                  {settings.gradingPeriods.map((period) => (
                    <div
                      key={period.id}
                      className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center"
                    >
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={period.name}
                          onChange={(e) => handleGradingPeriodChange(period.id, "name", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={period.startDate}
                          onChange={(e) => handleGradingPeriodChange(period.id, "startDate", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={period.endDate}
                          onChange={(e) => handleGradingPeriodChange(period.id, "endDate", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (%)</label>
                        <input
                          type="number"
                          value={period.weight}
                          onChange={(e) => handleGradingPeriodChange(period.id, "weight", parseInt(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="flex items-end justify-center">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          {period.shortName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "grading" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passing Grade (%)
                  </label>
                  <input
                    type="number"
                    value={settings.passingGrade}
                    onChange={(e) => handleSettingChange("passingGrade", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum score required to pass a course</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-4">Grading Scale</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Letter</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Min Score</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Max Score</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Color</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {settings.gradingScale.map((scale, index) => (
                        <tr key={scale.letter}>
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
                              style={{ backgroundColor: scale.color }}
                            >
                              {scale.letter}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={scale.minScore}
                              onChange={(e) => handleGradingScaleChange(index, "minScore", parseInt(e.target.value))}
                              className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={scale.maxScore}
                              onChange={(e) => handleGradingScaleChange(index, "maxScore", parseInt(e.target.value))}
                              className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={scale.description}
                              onChange={(e) => handleGradingScaleChange(index, "description", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="color"
                              value={scale.color}
                              onChange={(e) => handleGradingScaleChange(index, "color", e.target.value)}
                              className="w-10 h-8 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grading Scale Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-3">Preview</h5>
                <div className="flex gap-2">
                  {settings.gradingScale.map((scale) => (
                    <div
                      key={scale.letter}
                      className="flex-1 p-3 rounded-lg text-center text-white"
                      style={{ backgroundColor: scale.color }}
                    >
                      <p className="text-lg font-bold">{scale.letter}</p>
                      <p className="text-xs opacity-90">
                        {scale.minScore}-{scale.maxScore}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Attendance Rate (%)
                  </label>
                  <input
                    type="number"
                    value={settings.attendanceRequired}
                    onChange={(e) => handleSettingChange("attendanceRequired", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum attendance percentage required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Absences per Semester
                  </label>
                  <input
                    type="number"
                    value={settings.maxAbsences}
                    onChange={(e) => handleSettingChange("maxAbsences", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Students exceeding this will be flagged</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Late Threshold (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.lateThreshold}
                    onChange={(e) => handleSettingChange("lateThreshold", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minutes after class start to mark as late</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <div>
                    <h5 className="font-medium text-blue-800">Attendance Policies</h5>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>- Students with attendance below {settings.attendanceRequired}% may be subject to academic probation</li>
                      <li>- Excused absences require documentation within 3 school days</li>
                      <li>- Three late arrivals count as one absence</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.classStartTime}
                    onChange={(e) => handleSettingChange("classStartTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class End Time
                  </label>
                  <input
                    type="time"
                    value={settings.classEndTime}
                    onChange={(e) => handleSettingChange("classEndTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-4">Weekly Schedule Template</h4>
                <div className="grid grid-cols-5 gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                    <div key={day} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="font-medium text-gray-900 text-sm">{day}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {settings.classStartTime} - {settings.classEndTime}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-600">schedule</span>
                  <div>
                    <h5 className="font-medium text-yellow-800">Schedule Notes</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Individual course schedules are managed by teachers. These settings define
                      the default school day boundaries.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Academic Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddYearModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Academic Year</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2025-2026"
                    value={newYear.name}
                    onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newYear.startDate}
                      onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newYear.endDate}
                      onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddYear}
                  disabled={!newYear.name || !newYear.startDate || !newYear.endDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  Add Year
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => showDeleteModal && handleDeleteYear(showDeleteModal.id)}
        title="Delete Academic Year"
        message="Are you sure you want to delete this academic year? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
