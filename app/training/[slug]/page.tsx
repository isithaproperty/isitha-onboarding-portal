import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { trainingModules } from '@/lib/training';

export default async function TrainingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const module = trainingModules.find((item) => item.slug === slug);

  if (!module) {
    notFound();
  }

  return (
    <main className="shell">
      <Header />

      <section className="hero">
        <span className="pill">{module.category}</span>
        <h1>{module.title}</h1>

        <p className="muted">
          Estimated duration: {module.duration}
        </p>
      </section>

      <section className="section">
        {module.sections.map((section, index) => (
          <div className="card" key={section.title} style={{ marginBottom: 18 }}>
            <div className="muted">Section {index + 1}</div>

            <h2>{section.title}</h2>

            <p style={{ lineHeight: 1.7 }}>
              {section.body}
            </p>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="card">
          <h2>Training acknowledgement</h2>

          <p>
            By continuing, I confirm that I have read and understood this
            training module.
          </p>

          <button className="button">
            I have read and understood
          </button>
        </div>
      </section>

      <section className="section">
        <Link href="/">← Back to My Portal</Link>
      </section>
    </main>
  );
}
