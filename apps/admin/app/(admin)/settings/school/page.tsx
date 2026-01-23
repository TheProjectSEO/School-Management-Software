"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui";

interface SchoolSettings {
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  principal: string;
  foundedYear: string;
  schoolType: string;
  logo: string | null;
}

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings>({
    name: "Mindanao State University",
    code: "MSU-001",
    address: "MSU Main Campus",
    city: "Marawi City",
    province: "Lanao del Sur",
    postalCode: "9700",
    phone: "(063) 352-1234",
    email: "admin@msu.edu.ph",
    website: "https://www.msu.edu.ph",
    principal: "Dr. Basri A. Mapupuno",
    foundedYear: "1961",
    schoolType: "state_university",
    logo: null,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "contact" | "branding">("general");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/school");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof SchoolSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/school", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        // Show success toast
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/admin/settings/school/logo", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        setSettings((prev) => ({ ...prev, logo: url }));
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
    }
  };

  const tabs = [
    { key: "general", label: "General", icon: "info" },
    { key: "contact", label: "Contact", icon: "contact_mail" },
    { key: "branding", label: "Branding", icon: "palette" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
          <p className="text-gray-500 mt-1">Manage your school's profile and information</p>
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

      {/* School Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
          <div className="relative">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="School Logo"
                className="w-24 h-24 rounded-xl object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-3xl text-white font-bold">
                  {settings.name.charAt(0)}
                </span>
              </div>
            )}
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-gray-600 text-lg">edit</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{settings.name}</h2>
            <p className="text-gray-500">{settings.code}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium capitalize">
                {settings.schoolType.replace("_", " ")}
              </span>
              <span className="text-sm text-gray-500">Est. {settings.foundedYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex gap-1 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Type
                </label>
                <select
                  value={settings.schoolType}
                  onChange={(e) => handleChange("schoolType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="state_university">State University</option>
                  <option value="private_university">Private University</option>
                  <option value="public_high_school">Public High School</option>
                  <option value="private_high_school">Private High School</option>
                  <option value="public_elementary">Public Elementary</option>
                  <option value="private_elementary">Private Elementary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Founded
                </label>
                <input
                  type="text"
                  value={settings.foundedYear}
                  onChange={(e) => handleChange("foundedYear", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Principal/Head
                </label>
                <input
                  type="text"
                  value={settings.principal}
                  onChange={(e) => handleChange("principal", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City/Municipality
                </label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={settings.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={settings.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                    phone
                  </span>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                    email
                  </span>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                    language
                  </span>
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Additional Contact Information</h4>
                <p className="text-sm text-gray-500">
                  For additional contact numbers or emergency hotlines, please contact the system administrator.
                </p>
              </div>
            </div>
          )}

          {activeTab === "branding" && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-4">School Logo</h4>
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {settings.logo ? (
                      <img
                        src={settings.logo}
                        alt="School Logo"
                        className="w-32 h-32 rounded-xl object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        <span className="material-symbols-outlined text-4xl text-gray-400">
                          add_photo_alternate
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-3">
                      Upload your school's official logo. Recommended size: 512x512 pixels.
                      Supported formats: PNG, JPG, SVG.
                    </p>
                    <div className="flex gap-2">
                      <label className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer">
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.logo && (
                        <button
                          onClick={() => handleChange("logo", "")}
                          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-medium text-gray-700 mb-4">Brand Colors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: "#7B1113" }} />
                      <div>
                        <p className="font-medium text-gray-900">Primary Color</p>
                        <p className="text-sm text-gray-500">#7B1113 (MSU Maroon)</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: "#FDB913" }} />
                      <div>
                        <p className="font-medium text-gray-900">Accent Color</p>
                        <p className="text-sm text-gray-500">#FDB913 (MSU Gold)</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Brand colors are fixed to maintain MSU's official identity. Contact the system administrator for customization requests.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value="1,250"
          icon="school"
          color="bg-blue-500"
        />
        <StatCard
          label="Total Teachers"
          value="85"
          icon="person"
          color="bg-green-500"
        />
        <StatCard
          label="Active Courses"
          value="42"
          icon="menu_book"
          color="bg-purple-500"
        />
        <StatCard
          label="Sections"
          value="36"
          icon="groups"
          color="bg-orange-500"
        />
      </div>
    </div>
  );
}
