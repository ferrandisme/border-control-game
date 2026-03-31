import { WorkContractDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';
import { FieldList } from './FieldList';

type WorkContractDocProps = {
  document: WorkContractDocument;
};

export function WorkContractDoc({ document }: WorkContractDocProps) {
  return (
    <DocumentShell title="Contrato laboral" subtitle={document.company} type="work_contract">
      <FieldList
        fields={[
          { label: 'Empresa', value: document.company },
          { label: 'Cargo', value: document.position },
          { label: 'Inicio', value: document.start_date },
          { label: 'Salario mensual', value: document.monthly_salary },
          { label: 'País', value: document.country },
        ]}
      />
    </DocumentShell>
  );
}
