import { useTheme } from '../context/ThemeContext';
import { InfoPage } from '../components/info-page';

export default function InfoPageWrapper() {
  const { isDark } = useTheme();
  return <InfoPage isDark={isDark} />;
}
