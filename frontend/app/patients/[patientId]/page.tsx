import { AppLayout } from "../../app-layout";

type PatientDetailPageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { patientId } = await params;

  return (
    <AppLayout>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium text-secondary">Patient detail</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-text-strong">
            Patient {patientId}
          </h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="min-h-80 rounded-lg border border-border bg-panel p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-strong">
              Vitals placeholder
            </h2>
            <div className="mt-6 flex h-48 items-center justify-center rounded-md border border-dashed border-border bg-surface text-sm text-text-body">
              Chart area
            </div>
          </article>

          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-strong">
              Alert history
            </h2>
            <div className="mt-4 space-y-3">
              {["Normal signal received", "Mock alert queue ready"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-md border border-border bg-white px-3 py-3 text-sm text-text-body"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </article>
        </div>
      </section>
    </AppLayout>
  );
}
