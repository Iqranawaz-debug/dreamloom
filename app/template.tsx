// Re-mounts on every navigation, giving each section a soft fade-in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in flex flex-1 flex-col">{children}</div>;
}
