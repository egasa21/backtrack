import Link from "next/link";
export default function NotFound() { return <div className="panel empty-state"><h1>That step isn’t on the roadmap.</h1><p>Choose a module to continue your journey.</p><Link href="/roadmap/" className="button button-primary">Open roadmap →</Link></div>; }
