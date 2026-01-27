/**
 * Report Card PDF Generator
 *
 * Generates professional PDF report cards using @react-pdf/renderer.
 * The PDF includes:
 * - School header with logo
 * - Student information section
 * - Grades table
 * - GPA summary
 * - Attendance summary
 * - Teacher remarks
 * - Footer with generation date
 *
 * Note: @react-pdf/renderer must be installed:
 * npm install @react-pdf/renderer
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type {
  ReportCard,
  SchoolInfo,
  ReportCardGrade,
  ReportCardGPA,
  ReportCardAttendance,
  TeacherRemark,
  AcademicStanding,
} from "@/lib/types/report-card";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // Header
  header: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#7B1113",
    paddingBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7B1113",
    marginBottom: 4,
  },
  schoolAddress: {
    fontSize: 9,
    color: "#666666",
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7B1113",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  periodInfo: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
    marginBottom: 15,
  },
  // Student Info
  studentSection: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#7B1113",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontSize: 9,
    color: "#666666",
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: "#333333",
    fontWeight: "bold",
  },
  // Grades Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#7B1113",
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tableRowAlt: {
    backgroundColor: "#F8F9FA",
  },
  courseCol: {
    flex: 2,
  },
  codeCol: {
    width: 60,
  },
  creditsCol: {
    width: 50,
    textAlign: "center",
  },
  gradeCol: {
    width: 50,
    textAlign: "center",
  },
  letterCol: {
    width: 40,
    textAlign: "center",
  },
  gpaCol: {
    width: 40,
    textAlign: "center",
  },
  teacherCol: {
    flex: 1,
  },
  // Summary Boxes
  summaryContainer: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 15,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#7B1113",
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#7B1113",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#666666",
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333333",
  },
  gpaHighlight: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7B1113",
    textAlign: "center",
    marginVertical: 8,
  },
  standingBadge: {
    backgroundColor: "#FDB913",
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  standingText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#7B1113",
    textAlign: "center",
  },
  // Attendance
  attendanceBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  attendanceFill: {
    height: 8,
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  // Remarks
  remarksSection: {
    marginBottom: 15,
  },
  remarkItem: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#FDB913",
  },
  remarkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  remarkTeacher: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333333",
  },
  remarkSubject: {
    fontSize: 8,
    color: "#666666",
  },
  remarkText: {
    fontSize: 9,
    color: "#333333",
    fontStyle: "italic",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#999999",
  },
  // Signature
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginBottom: 40,
  },
  signatureBox: {
    width: "30%",
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#333333",
    width: "100%",
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
  },
});

// ============================================================================
// PDF DOCUMENT COMPONENT
// ============================================================================

interface ReportCardPDFProps {
  reportCard: ReportCard;
  schoolInfo: SchoolInfo;
}

/**
 * Report Card PDF Document Component
 */
function ReportCardPDF({ reportCard, schoolInfo }: ReportCardPDFProps) {
  const { student_info, grades, gpa, attendance, teacher_remarks, grading_period } = reportCard;

  return createElement(
    Document,
    { title: `Report Card - ${student_info.full_name}` },
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        schoolInfo.logo_url &&
          createElement(Image, { src: schoolInfo.logo_url, style: styles.logo }),
        createElement(
          View,
          { style: styles.schoolInfo },
          createElement(Text, { style: styles.schoolName }, schoolInfo.name),
          schoolInfo.address &&
            createElement(Text, { style: styles.schoolAddress }, schoolInfo.address),
          schoolInfo.city &&
            createElement(Text, { style: styles.schoolAddress }, schoolInfo.city)
        )
      ),
      // Report Title
      createElement(Text, { style: styles.reportTitle }, "OFFICIAL REPORT CARD"),
      createElement(
        Text,
        { style: styles.periodInfo },
        `${grading_period?.name || "Grading Period"} - ${grading_period?.academic_year || "Academic Year"}`
      ),
      // Student Information
      createElement(
        View,
        { style: styles.studentSection },
        createElement(Text, { style: styles.sectionTitle }, "STUDENT INFORMATION"),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, "Full Name:"),
          createElement(Text, { style: styles.infoValue }, student_info.full_name)
        ),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, "LRN:"),
          createElement(Text, { style: styles.infoValue }, student_info.lrn || "N/A")
        ),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, "Grade Level:"),
          createElement(Text, { style: styles.infoValue }, student_info.grade_level)
        ),
        createElement(
          View,
          { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, "Section:"),
          createElement(Text, { style: styles.infoValue }, student_info.section_name)
        ),
        student_info.student_number &&
          createElement(
            View,
            { style: styles.infoRow },
            createElement(Text, { style: styles.infoLabel }, "Student Number:"),
            createElement(Text, { style: styles.infoValue }, student_info.student_number)
          )
      ),
      // Grades Table
      createElement(
        View,
        { style: styles.table },
        createElement(Text, { style: styles.sectionTitle }, "ACADEMIC GRADES"),
        createElement(
          View,
          { style: styles.tableHeader },
          createElement(Text, { style: [styles.tableHeaderText, styles.courseCol] }, "Course"),
          createElement(Text, { style: [styles.tableHeaderText, styles.codeCol] }, "Code"),
          createElement(Text, { style: [styles.tableHeaderText, styles.creditsCol] }, "Credits"),
          createElement(Text, { style: [styles.tableHeaderText, styles.gradeCol] }, "Grade"),
          createElement(Text, { style: [styles.tableHeaderText, styles.letterCol] }, "Letter"),
          createElement(Text, { style: [styles.tableHeaderText, styles.gpaCol] }, "GPA")
        ),
        ...grades.map((grade, index) =>
          createElement(
            View,
            {
              key: grade.course_id,
              style: [styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}],
            },
            createElement(Text, { style: styles.courseCol }, grade.course_name),
            createElement(Text, { style: styles.codeCol }, grade.subject_code),
            createElement(Text, { style: styles.creditsCol }, String(grade.credit_hours)),
            createElement(Text, { style: styles.gradeCol }, grade.numeric_grade.toFixed(1)),
            createElement(Text, { style: styles.letterCol }, grade.letter_grade),
            createElement(Text, { style: styles.gpaCol }, grade.gpa_points.toFixed(2))
          )
        )
      ),
      // Summary Boxes
      createElement(
        View,
        { style: styles.summaryContainer },
        // GPA Box
        createElement(
          View,
          { style: styles.summaryBox },
          createElement(Text, { style: styles.summaryTitle }, "GPA SUMMARY"),
          createElement(Text, { style: styles.gpaHighlight }, gpa.term_gpa.toFixed(2)),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Term GPA:"),
            createElement(Text, { style: styles.summaryValue }, gpa.term_gpa.toFixed(2))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Cumulative GPA:"),
            createElement(Text, { style: styles.summaryValue }, gpa.cumulative_gpa.toFixed(2))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Term Credits:"),
            createElement(Text, { style: styles.summaryValue }, String(gpa.term_credits))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Total Credits:"),
            createElement(Text, { style: styles.summaryValue }, String(gpa.cumulative_credits))
          ),
          createElement(
            View,
            { style: styles.standingBadge },
            createElement(
              Text,
              { style: styles.standingText },
              formatAcademicStanding(gpa.academic_standing)
            )
          )
        ),
        // Attendance Box
        createElement(
          View,
          { style: styles.summaryBox },
          createElement(Text, { style: styles.summaryTitle }, "ATTENDANCE SUMMARY"),
          createElement(Text, { style: styles.gpaHighlight }, `${attendance.attendance_rate}%`),
          createElement(
            View,
            { style: styles.attendanceBar },
            createElement(View, {
              style: [
                styles.attendanceFill,
                { width: `${Math.min(attendance.attendance_rate, 100)}%` },
              ],
            })
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Total Days:"),
            createElement(Text, { style: styles.summaryValue }, String(attendance.total_days))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Present:"),
            createElement(Text, { style: styles.summaryValue }, String(attendance.present_days))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Late:"),
            createElement(Text, { style: styles.summaryValue }, String(attendance.late_days))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Absent:"),
            createElement(Text, { style: styles.summaryValue }, String(attendance.absent_days))
          ),
          createElement(
            View,
            { style: styles.summaryRow },
            createElement(Text, { style: styles.summaryLabel }, "Excused:"),
            createElement(Text, { style: styles.summaryValue }, String(attendance.excused_days))
          )
        )
      ),
      // Teacher Remarks
      teacher_remarks &&
        teacher_remarks.length > 0 &&
        createElement(
          View,
          { style: styles.remarksSection },
          createElement(Text, { style: styles.sectionTitle }, "TEACHER REMARKS"),
          ...teacher_remarks.map((remark, index) =>
            createElement(
              View,
              { key: index, style: styles.remarkItem },
              createElement(
                View,
                { style: styles.remarkHeader },
                createElement(Text, { style: styles.remarkTeacher }, remark.teacher_name),
                createElement(Text, { style: styles.remarkSubject }, remark.subject)
              ),
              createElement(Text, { style: styles.remarkText }, `"${remark.remarks}"`)
            )
          )
        ),
      // Signature Section
      createElement(
        View,
        { style: styles.signatureSection },
        createElement(
          View,
          { style: styles.signatureBox },
          createElement(View, { style: styles.signatureLine }),
          createElement(Text, { style: styles.signatureLabel }, "Class Adviser")
        ),
        createElement(
          View,
          { style: styles.signatureBox },
          createElement(View, { style: styles.signatureLine }),
          createElement(Text, { style: styles.signatureLabel }, "Principal")
        ),
        createElement(
          View,
          { style: styles.signatureBox },
          createElement(View, { style: styles.signatureLine }),
          createElement(Text, { style: styles.signatureLabel }, "Parent/Guardian")
        )
      ),
      // Footer
      createElement(
        View,
        { style: styles.footer },
        createElement(
          Text,
          { style: styles.footerText },
          `Generated: ${new Date(reportCard.generated_at).toLocaleDateString()}`
        ),
        createElement(Text, { style: styles.footerText }, schoolInfo.name),
        createElement(
          Text,
          { style: styles.footerText },
          `Report Card ID: ${reportCard.id.slice(0, 8)}...`
        )
      )
    )
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format academic standing for display
 */
function formatAcademicStanding(standing: AcademicStanding): string {
  switch (standing) {
    case "presidents_list":
      return "PRESIDENT'S LIST";
    case "deans_list":
      return "DEAN'S LIST";
    case "good_standing":
      return "GOOD STANDING";
    case "probation":
      return "ACADEMIC PROBATION";
    case "suspension":
      return "ACADEMIC SUSPENSION";
    default:
      return "GOOD STANDING";
  }
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate a PDF buffer for a report card
 *
 * @param reportCard - The report card data
 * @param schoolInfo - School information for header
 * @returns PDF as a Buffer
 */
export async function generateReportCardPDF(
  reportCard: ReportCard,
  schoolInfo: SchoolInfo
): Promise<Buffer> {
  try {
    const pdfDocument = ReportCardPDF({ reportCard, schoolInfo });
    const buffer = await renderToBuffer(pdfDocument);
    return Buffer.from(buffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}

/**
 * Upload a PDF to Supabase Storage
 *
 * @param reportCardId - The report card ID
 * @param pdfBuffer - The PDF buffer
 * @param schoolId - The school ID (for bucket organization)
 * @returns Public URL of the uploaded PDF
 */
export async function uploadReportCardPDF(
  reportCardId: string,
  pdfBuffer: Buffer,
  schoolId: string
): Promise<string | null> {
  try {
    // Import dynamically to avoid circular dependencies
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const fileName = `${schoolId}/report-cards/${reportCardId}.pdf`;
    const bucket = "report-cards";

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("Error uploading PDF:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update report card with PDF URL
    const { error: updateError } = await supabase
      .from("report_cards")
      .update({
        pdf_url: publicUrl,
        pdf_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportCardId);

    if (updateError) {
      console.error("Error updating report card with PDF URL:", updateError);
    }

    return publicUrl;
  } catch (error) {
    console.error("Unexpected error uploading PDF:", error);
    return null;
  }
}

/**
 * Generate and upload a PDF for a report card
 *
 * @param reportCard - The report card data
 * @param schoolInfo - School information
 * @returns Public URL of the uploaded PDF, or null on failure
 */
export async function generateAndUploadPDF(
  reportCard: ReportCard,
  schoolInfo: SchoolInfo
): Promise<string | null> {
  try {
    const pdfBuffer = await generateReportCardPDF(reportCard, schoolInfo);
    const url = await uploadReportCardPDF(
      reportCard.id,
      pdfBuffer,
      reportCard.school_id
    );
    return url;
  } catch (error) {
    console.error("Error in generateAndUploadPDF:", error);
    return null;
  }
}

export { ReportCardPDF };
