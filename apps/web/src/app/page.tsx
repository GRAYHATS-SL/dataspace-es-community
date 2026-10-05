import FeaturesSection from '@/components/molecules/FeaturesSection';
import FAQs from '@/components/organisms/FAQs';
import Hero from '@/components/organisms/Hero';

/** Public landing page. */
export default function Home() {
  return (
    <>
      <Hero
        title="Bienvenido a tu marketplace"
        subtitle="Publica, descubre y consume productos y servicios. Solicita acceso para empezar."
        showEmailForm
      />
      <FeaturesSection />
      <FAQs />
    </>
  );
}
