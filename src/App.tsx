import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './lib/auth';
import { Account } from './pages/Account';
import { CompressJpg } from './pages/CompressJpg';
import { CompressPng } from './pages/CompressPng';
import { Home } from './pages/Home';
import { ImageToWebp } from './pages/ImageToWebp';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Pricing } from './pages/Pricing';
import { ResizeImage } from './pages/ResizeImage';
import { Signup } from './pages/Signup';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/compress-jpg" element={<CompressJpg />} />
            <Route path="/compress-png" element={<CompressPng />} />
            <Route path="/image-to-webp" element={<ImageToWebp />} />
            <Route path="/resize-image" element={<ResizeImage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
