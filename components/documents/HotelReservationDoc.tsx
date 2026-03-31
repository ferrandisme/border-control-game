import { HotelReservationDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';
import { FieldList } from './FieldList';

type HotelReservationDocProps = {
  document: HotelReservationDocument;
};

export function HotelReservationDoc({ document }: HotelReservationDocProps) {
  return (
    <DocumentShell title="Reserva hotelera" subtitle={document.hotel} type="hotel_reservation">
      <FieldList
        fields={[
          { label: 'Hotel', value: document.hotel },
          { label: 'Ciudad', value: document.city },
          { label: 'Check-in', value: document.check_in },
          { label: 'Check-out', value: document.check_out },
          { label: 'Nombre reserva', value: document.reservation_name },
          { label: 'Pasaporte', value: document.passport_number },
        ]}
      />
    </DocumentShell>
  );
}
