/** Calibration instruments from the certifications collection (names, issuers, months [info.md]) for the sim and 3D. */
import certs from '@/content/certifications.json';
import type { Instrument } from '@/sim/calibration';

export const INSTRUMENTS: Instrument[] = (certs as Array<Record<string, unknown>>).map((c) => ({
  id: String(c['id']),
  name: String(c['name']),
  issuer: c['issuer'] as Instrument['issuer'],
  ...(c['issued'] ? { issued: String(c['issued']) } : {}),
  ...(c['expires'] ? { expires: String(c['expires']) } : {}),
  ...(c['lifetime'] ? { lifetime: true } : {}),
}));
