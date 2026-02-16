/**
 * Nexus ERP Fiscal Constants - SAT (Mexico) CFDI 4.0
 */

export const TAX_REGIMES = [
    { id: '601', name: 'General de Ley Personas Morales' },
    { id: '603', name: 'Personas Morales con Fines no Lucrativos' },
    { id: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { id: '606', name: 'Arrendamiento' },
    { id: '608', name: 'Demás ingresos' },
    { id: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { id: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
    { id: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { id: '614', name: 'Ingresos por intereses' },
    { id: '616', name: 'Sin obligaciones fiscales' },
    { id: '621', name: 'Incorporación Fiscal' },
    { id: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { id: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
];

export const CFDI_USAGE = [
    { id: 'G01', name: 'Adquisición de mercancías' },
    { id: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
    { id: 'G03', name: 'Gastos en general' },
    { id: 'I01', name: 'Construcciones' },
    { id: 'I02', name: 'Mobiliario y equipo de oficina por inversiones' },
    { id: 'I04', name: 'Equipo de transporte' },
    { id: 'S01', name: 'Sin efectos fiscales' },
    { id: 'CP01', name: 'Pagos' },
    { id: 'CN01', name: 'Nómina' },
];

export const PAYMENT_FORMS = [
    { id: '01', name: 'Efectivo' },
    { id: '02', name: 'Cheque nominativo' },
    { id: '03', name: 'Transferencia electrónica de fondos' },
    { id: '04', name: 'Tarjeta de crédito' },
    { id: '05', name: 'Monedero electrónico' },
    { id: '28', name: 'Tarjeta de débito' },
    { id: '99', name: 'Por definir' },
];

export const PAYMENT_METHODS = [
    { id: 'PUE', name: 'Pago en una sola exhibición' },
    { id: 'PPD', name: 'Pago en parcialidades o diferido' },
];
