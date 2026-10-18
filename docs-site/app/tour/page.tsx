import { loadTourData } from '@/lib/tour-data';
import { TourConsole } from '@/components/tour/tour-console';

export const metadata = {
  title: 'HDS Console · Hirobius Design System',
  description:
    'One mock product screen, built from the design system’s own data, using every public component.',
};

export default function TourPage() {
  return (
    <main>
      <TourConsole data={loadTourData()} />
    </main>
  );
}
