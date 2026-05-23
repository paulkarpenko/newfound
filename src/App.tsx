import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Reader from './routes/Reader';
import { useNewfound } from './state/useNewfound';

export default function App() {
  const theme = useNewfound((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<Reader />} />
      <Route path="*" element={<Reader />} />
    </Routes>
  );
}
