import { StressScreen } from '@/components/stress/stress-screen';
import { STRESS_SCREENS } from '@/lib/stress-gaps';

/** /stress/<screen> (hds#520): real app screens built from public HDS only. */
export function generateStaticParams() {
  return STRESS_SCREENS.map((s) => ({ screen: s.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const s = STRESS_SCREENS.find((x) => x.id === screen);
  return {
    title: `${s?.title ?? 'Stress test'} · HDS stress test`,
    description: s?.summary,
    robots: { index: false },
  };
}

export default async function StressPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  return (
    <main>
      <StressScreen id={screen} />
    </main>
  );
}
