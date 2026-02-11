"use client";

import { useState } from "react";
import Link from "next/link";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "How do I reset my student portal password?",
    answer:
      'Go to the login page and click "Forgot Password". Enter your student ID and registered email. A temporary reset link will be sent to you immediately.',
  },
  {
    question: 'Why is my enrollment status "Pending"?',
    answer:
      'A "Pending" status usually means your payment is being verified or your adviser has not yet approved your study load. Please check your "Notifications" tab for specific alerts.',
  },
  {
    question: "Where can I download my grades for the last semester?",
    answer:
      'Navigate to the "Grades" tab in the top menu. Select the relevant semester from the dropdown, and click the "Print/Download PDF" button on the top right.',
  },
  {
    question: "How do I access the campus Wi-Fi?",
    answer:
      'Use your Student ID number as the username and your portal password to connect to "MSU-Student-Secure" network while on campus.',
  },
];

const quickLinks = [
  { name: "Student Handbook 2024", icon: "menu_book", href: "#" },
  { name: "Academic Calendar", icon: "calendar_month", href: "#" },
  { name: "Downloadable Forms", icon: "download", href: "#" },
];

export default function HelpClient() {
  const { isPlayful } = useStudentTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Hero Section */}
      <div className={`relative w-full border-b ${isPlayful ? "bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200" : "bg-white dark:bg-[#1a2634] border-slate-200 dark:border-slate-700"}`}>
        <div className={`absolute inset-0 w-full h-full ${isPlayful ? "bg-gradient-to-br from-pink-100/30 to-purple-100/30" : "bg-gradient-to-br from-primary/5 to-msu-gold/5"}`}></div>
        <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center text-center">
          {/* Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-msu-green/10 text-msu-green text-xs font-bold uppercase tracking-wider mb-6 border border-msu-green/30">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            System Operational
          </span>

          {/* Heading */}
          <h1 className={`text-3xl md:text-5xl font-black mb-4 tracking-tight ${isPlayful ? "text-purple-700" : "text-primary dark:text-white"}`}>
            {isPlayful ? (
              <>
                {"\u2753"} Help Center
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                  We&apos;re here for you!
                </span>
              </>
            ) : (
              <>
                Hello, Student.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-msu-green">
                  How can we help?
                </span>
              </>
            )}
          </h1>
          <p className={`text-lg max-w-2xl mb-8 leading-relaxed ${isPlayful ? "text-purple-500" : "text-slate-500 dark:text-slate-400"}`}>
            {isPlayful
              ? "Need help with something? Search below or pick a topic and we\u2019ll help you out!"
              : <>Search our knowledge base for quick answers or let us know if you&apos;re facing an issue with enrollment, grades, or connectivity.</>}
          </p>

          {/* Search Bar */}
          <div className={`w-full max-w-2xl relative shadow-lg ${isPlayful ? "rounded-2xl" : "rounded-lg"}`}>
            <div className={`flex w-full items-stretch bg-white overflow-hidden transition-all ${isPlayful ? "rounded-2xl border-2 border-pink-300 focus-within:border-purple-400 dark:bg-white" : "rounded-lg dark:bg-slate-800 border-2 border-transparent focus-within:border-msu-gold"}`}>
              <div className={`flex items-center justify-center pl-5 ${isPlayful ? "text-pink-400" : "text-slate-400"}`}>
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className={`w-full bg-transparent border-none placeholder-slate-400 focus:ring-0 px-4 py-5 text-base outline-none ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}
                placeholder={isPlayful ? "What do you need help with? \u{1F50D}" : "Search for answers (e.g., reset password, enrollment error)..."}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className={`font-bold px-6 py-2 m-2 rounded-md transition-colors flex items-center gap-2 shadow-md ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl" : "bg-primary hover:bg-[#5a0c0e] text-white"}`}>
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-12">
            {/* Report an Issue Section */}
            <section>
              <div className={`flex items-center gap-3 mb-6 border-l-4 pl-4 ${isPlayful ? "border-pink-400" : "border-primary"}`}>
                <span className={`material-symbols-outlined ${isPlayful ? "text-pink-500" : "text-primary"}`}>report_problem</span>
                <h3 className={`text-2xl font-bold tracking-tight ${isPlayful ? "text-purple-700" : "text-slate-900 dark:text-white"}`}>
                  {isPlayful ? "\u{1F6A8} Report an Issue" : "Report an Issue"}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Issue Card */}
                <div className={`group shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden ${isPlayful ? "bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl hover:border-purple-300" : "bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-msu-gold/50"}`}>
                  <div className={`w-full h-32 flex items-center justify-center relative ${isPlayful ? "bg-gradient-to-br from-pink-400 to-purple-400" : "bg-gradient-to-br from-primary/80 to-primary"}`}>
                    <span className="material-symbols-outlined text-white/30 text-6xl">
                      computer
                    </span>
                    <div className={`absolute inset-0 transition-colors ${isPlayful ? "bg-purple-500/10 group-hover:bg-purple-500/0" : "bg-primary/20 group-hover:bg-primary/10"}`}></div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className={`text-lg font-bold transition-colors mb-2 ${isPlayful ? "text-purple-700 group-hover:text-pink-600" : "text-slate-900 dark:text-white group-hover:text-primary"}`}>
                      {isPlayful ? "\u{1F4BB} Technical Issue" : "Technical Issue"}
                    </h4>
                    <p className={`text-sm mb-6 leading-relaxed ${isPlayful ? "text-purple-500" : "text-slate-500 dark:text-slate-400"}`}>
                      Login problems, LMS errors, VPN access, or email setup issues.
                    </p>
                    <button className={`mt-auto w-full py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-between group/btn ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 border-0" : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-primary hover:text-white hover:border-primary"}`}>
                      Create Ticket
                      <span className={`material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform ${isPlayful ? "text-white" : "text-msu-gold group-hover/btn:text-white"}`}>
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>

                {/* Academic Concern Card */}
                <div className={`group shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden ${isPlayful ? "bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-pink-200 rounded-2xl hover:border-purple-300" : "bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-msu-green/50"}`}>
                  <div className={`w-full h-32 flex items-center justify-center relative ${isPlayful ? "bg-gradient-to-br from-purple-400 to-pink-400" : "bg-gradient-to-br from-msu-green/80 to-msu-green"}`}>
                    <span className="material-symbols-outlined text-white/30 text-6xl">
                      school
                    </span>
                    <div className={`absolute inset-0 transition-colors ${isPlayful ? "bg-pink-500/10 group-hover:bg-pink-500/0" : "bg-msu-green/20 group-hover:bg-msu-green/10"}`}></div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className={`text-lg font-bold transition-colors mb-2 ${isPlayful ? "text-purple-700 group-hover:text-pink-600" : "text-slate-900 dark:text-white group-hover:text-msu-green"}`}>
                      {isPlayful ? "\u{1F393} Academic Concern" : "Academic Concern"}
                    </h4>
                    <p className={`text-sm mb-6 leading-relaxed ${isPlayful ? "text-purple-500" : "text-slate-500 dark:text-slate-400"}`}>
                      Grade inquiries, subject enrollment, prerequisites, or schedule conflicts.
                    </p>
                    <button className={`mt-auto w-full py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-between group/btn ${isPlayful ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 border-0" : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-msu-green hover:text-white hover:border-msu-green"}`}>
                      Contact Registrar
                      <span className={`material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform ${isPlayful ? "text-white" : "text-msu-green group-hover/btn:text-white"}`}>
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section>
              <div className={`flex items-center justify-between mb-6 border-l-4 pl-4 ${isPlayful ? "border-purple-400" : "border-msu-gold"}`}>
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${isPlayful ? "text-purple-500" : "text-msu-gold"}`}>help</span>
                  <h3 className={`text-2xl font-bold tracking-tight ${isPlayful ? "text-purple-700" : "text-slate-900 dark:text-white"}`}>
                    {isPlayful ? "\u{1F4AC} Frequently Asked Questions" : "Frequently Asked Questions"}
                  </h3>
                </div>
                <button
                  disabled
                  className="text-sm font-bold text-slate-400 cursor-not-allowed hidden sm:block"
                  title="Coming soon"
                >
                  View Knowledge Base
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className={`shadow-sm overflow-hidden transition-all ${
                      isPlayful
                        ? `bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200 ${openFaq === index ? "ring-2 ring-purple-300" : ""}`
                        : `bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 ${openFaq === index ? "ring-2 ring-primary/10" : ""}`
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className={`flex items-center justify-between w-full p-5 cursor-pointer select-none transition-colors text-left ${isPlayful ? "hover:bg-pink-100/50" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    >
                      <span className={`font-semibold pr-4 ${isPlayful ? "text-purple-700" : "text-slate-900 dark:text-white"}`}>
                        {faq.question}
                      </span>
                      <span
                        className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          openFaq === index
                            ? isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "bg-primary text-white"
                            : isPlayful ? "bg-pink-100 text-purple-500" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-sm transition-transform duration-300 ${
                            openFaq === index ? "rotate-180" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </span>
                    </button>
                    {openFaq === index && (
                      <div className={`px-5 pb-5 pt-4 text-sm leading-relaxed border-t ${isPlayful ? "text-purple-600 border-pink-200" : "text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700"}`}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Quick Links */}
            <div className={`shadow-sm p-6 relative overflow-hidden ${isPlayful ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200" : "bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700"}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${isPlayful ? "bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" : "bg-gradient-to-r from-primary via-msu-gold to-msu-green"}`}></div>
              <h4 className={`text-lg font-bold mb-6 ${isPlayful ? "text-purple-700" : "text-slate-900 dark:text-white"}`}>
                {isPlayful ? "\u{1F517} Quick Links" : "Quick Links"}
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-4 text-sm font-medium transition-colors group p-2 rounded-lg -mx-2 ${isPlayful ? "text-purple-600 hover:text-pink-600 hover:bg-pink-100/50" : "text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    >
                      <span className={`size-9 rounded-lg flex items-center justify-center transition-colors ${isPlayful ? "bg-pink-100 text-purple-500 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 group-hover:text-white" : "bg-slate-100 dark:bg-slate-700 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                        <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                      </span>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support MSU Section */}
            <div className={`p-6 relative ${isPlayful ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200" : "bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20"}`}>
              <div className="absolute -top-3 -right-3">
                <span className={`material-symbols-outlined text-6xl rotate-12 ${isPlayful ? "text-purple-300/30" : "text-primary/10"}`}>
                  support_agent
                </span>
              </div>
              <h4 className={`text-lg font-bold mb-2 ${isPlayful ? "text-purple-700" : "text-primary dark:text-red-400"}`}>
                {isPlayful ? "\u{1F64B} Still need help?" : "Still need help?"}
              </h4>
              <p className={`text-sm mb-6 ${isPlayful ? "text-purple-500" : "text-slate-500 dark:text-slate-400"}`}>
                {isPlayful ? "Our friendly support team is ready to help you!" : "Our support team is available Mon-Fri, 8:00 AM - 5:00 PM."}
              </p>
              <div className="space-y-4 relative z-10">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shadow-sm ${isPlayful ? "bg-pink-100 border border-pink-200" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${isPlayful ? "text-pink-500" : "text-primary"}`}>call</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                      Call Us
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary cursor-pointer mt-0.5">
                      +63 (063) 221-4050
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shadow-sm ${isPlayful ? "bg-purple-100 border border-purple-200" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${isPlayful ? "text-purple-500" : "text-primary"}`}>mail</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                      Email Support
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary cursor-pointer mt-0.5">
                      helpdesk@msu.edu.ph
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shadow-sm ${isPlayful ? "bg-pink-100 border border-pink-200" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${isPlayful ? "text-pink-500" : "text-primary"}`}>
                      location_on
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                      Visit Us
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      DICT Building, Main Campus
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Map Placeholder */}
            <div className={`overflow-hidden shadow-sm h-44 relative group cursor-pointer ${isPlayful ? "rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-200/40 to-purple-200/40" : "rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-primary/20 to-msu-gold/20"}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`material-symbols-outlined text-8xl ${isPlayful ? "text-purple-300/40" : "text-primary/30"}`}>map</span>
              </div>
              <div className={`absolute inset-0 transition-colors flex items-center justify-center ${isPlayful ? "bg-purple-400/5 group-hover:bg-purple-400/10" : "bg-primary/10 group-hover:bg-primary/20"}`}>
                <div className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transform group-hover:-translate-y-1 transition-transform ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "bg-white text-primary"}`}>
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  {isPlayful ? "\u{1F5FA}\u{FE0F} View Campus Map" : "View Campus Map"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
