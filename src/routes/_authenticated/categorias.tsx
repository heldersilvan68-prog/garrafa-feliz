import { createFileRoute } from '@tanstack/react-router';
import { TabelasAuxiliares } from '@/components/TabelasAuxiliares';

export const Route = createFileRoute('/_authenticated/categorias')({
  component: TabelasAuxiliares,
});