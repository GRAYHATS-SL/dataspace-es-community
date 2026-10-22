import FeaturesSection from '@/components/molecules/FeaturesSection';
import FAQs from '@/components/organisms/FAQs';
import Hero from '@/components/organisms/Hero';

export default function Home() {
  return (
    <>
      <Hero
        title="El Espacio de Datos multisectorial de referencia en España"
        subtitle="Publica, descubre y consume servicios de datos con soberanía, interoperabilidad y seguridad certificada (ENS Alto). Solicita tu adhesión a Dataspace.es."
        // badgeText="Espacio de Datos Multisectorial"
        showEmailForm={true}
      />
      <FeaturesSection />
      <FAQs />
    </>
  );
}
