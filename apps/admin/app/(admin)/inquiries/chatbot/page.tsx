import { Metadata } from "next";
import { InquiryChatbot } from "@/components/chatbot/InquiryChatbot";

export const metadata: Metadata = {
  title: "AI Inquiry Chatbot | Admin Portal",
  description: "Test and manage the AI-powered inquiry chatbot",
};

export default function ChatbotPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          AI Inquiry Chatbot
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Test the AI-powered chatbot that handles parent and prospective student inquiries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chatbot Preview */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            Live Preview
          </h3>
          <div className="h-[600px]">
            <InquiryChatbot floating={false} />
          </div>
        </div>

        {/* Information Panel */}
        <div className="space-y-6">
          {/* About Section */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">
              About This Chatbot
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This AI-powered chatbot automatically responds to common inquiries from
              prospective parents and students. It can handle questions about:
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                Admissions process and requirements
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                Programs and curriculum
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                Tuition and fee information
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                School schedules and calendar
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                Facilities and extracurriculars
              </li>
            </ul>
          </div>

          {/* Escalation Info */}
          <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">priority_high</span>
              Smart Escalation
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              The chatbot automatically detects when a query requires human attention
              and will flag the conversation for follow-up. This includes:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-amber-700 dark:text-amber-400">
              <li>- Complaints or urgent matters</li>
              <li>- Special accommodation requests</li>
              <li>- Complex scholarship inquiries</li>
              <li>- When the AI is uncertain</li>
            </ul>
          </div>

          {/* Usage Instructions */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">
              How to Use
            </h3>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Embed on Landing Page:
                </p>
                <p>Add the chatbot widget to your school's website to handle
                   visitor inquiries 24/7.</p>
              </div>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Test Responses:
                </p>
                <p>Use the preview on the left to test how the chatbot responds
                   to different types of questions.</p>
              </div>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Review Conversations:
                </p>
                <p>Monitor escalated conversations in the main inquiry management
                   dashboard.</p>
              </div>
            </div>
          </div>

          {/* Stats Placeholder */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
                <p className="text-xs text-slate-500">Conversations Today</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
                <p className="text-xs text-slate-500">Avg Response Time</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
                <p className="text-xs text-slate-500">Escalated</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
                <p className="text-xs text-slate-500">Satisfaction Rate</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Stats tracking coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
