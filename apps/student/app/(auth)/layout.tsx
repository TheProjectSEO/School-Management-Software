export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display overflow-x-hidden justify-center items-center">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[30vw] h-[30vw] bg-yellow-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[35vw] h-[35vw] bg-red-800/5 rounded-full blur-[90px]"></div>
      </div>
      {children}
    </div>
  );
}
