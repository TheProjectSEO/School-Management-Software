"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Hero Section */}
      <div className="relative w-full bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-700">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/5 to-msu-gold/5"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center text-center">
          {/* Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-msu-green/10 text-msu-green text-xs font-bold uppercase tracking-wider mb-6 border border-msu-green/30">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            System Operational
          </span>

          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-black text-primary dark:text-white mb-4 tracking-tight">
            Hello, Student.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-msu-green">
              How can we help?
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mb-8 leading-relaxed">
            Search our knowledge base for quick answers or let us know if you&apos;re facing an
            issue with enrollment, grades, or connectivity.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl relative shadow-lg rounded-lg">
            <div className="flex w-full items-stretch rounded-lg bg-white dark:bg-slate-800 border-2 border-transparent focus-within:border-msu-gold overflow-hidden transition-all">
              <div className="flex items-center justify-center pl-5 text-slate-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 px-4 py-5 text-base outline-none"
                placeholder="Search for answers (e.g., reset password, enrollment error)..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="bg-primary hover:bg-[#5a0c0e] text-white font-bold px-6 py-2 m-2 rounded-md transition-colors flex items-center gap-2 shadow-md">
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
              <div className="flex items-center gap-3 mb-6 border-l-4 border-primary pl-4">
                <span className="material-symbols-outlined text-primary">report_problem</span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Report an Issue
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Issue Card */}
                <div className="group bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-xl hover:border-msu-gold/50 transition-all duration-300 flex flex-col h-full overflow-hidden">
                  <div className="w-full h-32 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-white/30 text-6xl">
                      computer
                    </span>
                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors"></div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors mb-2">
                      Technical Issue
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      Login problems, LMS errors, VPN access, or email setup issues.
                    </p>
                    <button className="mt-auto w-full py-3 px-4 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-between group/btn">
                      Create Ticket
                      <span className="material-symbols-outlined text-[18px] text-msu-gold group-hover/btn:text-white group-hover/btn:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>

                {/* Academic Concern Card */}
                <div className="group bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-xl hover:border-msu-green/50 transition-all duration-300 flex flex-col h-full overflow-hidden">
                  <div className="w-full h-32 bg-gradient-to-br from-msu-green/80 to-msu-green flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-white/30 text-6xl">
                      school
                    </span>
                    <div className="absolute inset-0 bg-msu-green/20 group-hover:bg-msu-green/10 transition-colors"></div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-msu-green transition-colors mb-2">
                      Academic Concern
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      Grade inquiries, subject enrollment, prerequisites, or schedule conflicts.
                    </p>
                    <button className="mt-auto w-full py-3 px-4 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 hover:bg-msu-green hover:text-white hover:border-msu-green transition-all flex items-center justify-between group/btn">
                      Contact Registrar
                      <span className="material-symbols-outlined text-[18px] text-msu-green group-hover/btn:text-white group-hover/btn:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section>
              <div className="flex items-center justify-between mb-6 border-l-4 border-msu-gold pl-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-msu-gold">help</span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Frequently Asked Questions
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
                    className={`bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all ${
                      openFaq === index ? "ring-2 ring-primary/10" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="flex items-center justify-between w-full p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 select-none transition-colors text-left"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white pr-4">
                        {faq.question}
                      </span>
                      <span
                        className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          openFaq === index
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500"
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
                      <div className="px-5 pb-5 pt-0 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4">
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
            <div className="bg-white dark:bg-[#1a2634] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-msu-gold to-msu-green"></div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors group p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg -mx-2"
                    >
                      <span className="size-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                      </span>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support MSU Section */}
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 p-6 relative">
              <div className="absolute -top-3 -right-3">
                <span className="material-symbols-outlined text-6xl text-primary/10 rotate-12">
                  support_agent
                </span>
              </div>
              <h4 className="text-lg font-bold text-primary dark:text-red-400 mb-2">
                Still need help?
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Our support team is available Mon-Fri, 8:00 AM - 5:00 PM.
              </p>
              <div className="space-y-4 relative z-10">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-700 p-2.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
                    <span className="material-symbols-outlined text-primary text-[20px]">call</span>
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
                  <div className="bg-white dark:bg-slate-700 p-2.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
                    <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
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
                  <div className="bg-white dark:bg-slate-700 p-2.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
                    <span className="material-symbols-outlined text-primary text-[20px]">
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
            <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 h-44 relative group cursor-pointer bg-gradient-to-br from-primary/20 to-msu-gold/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary/30 text-8xl">map</span>
              </div>
              <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                <div className="bg-white text-primary px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transform group-hover:-translate-y-1 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  View Campus Map
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
