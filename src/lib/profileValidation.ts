import type { DeliveryAddress } from '../types';

export type AddressFieldErrors = {
  name?: string;
  addressLine?: string;
  phone?: string;
  zipCode?: string;
  zone?: string;
};

const DELIVERY_ZONES = ['Downtown Yangon', 'Yankin', 'Bahan', 'Hlaing'] as const;

/** Myanmar mobiles: 09XXXXXXXX / +959XXXXXXXX (8–10 digits after 09). */
export function normalizeMyanmarPhone(value: string): string {
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+959')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('959')) digits = '0' + digits.slice(3);
  return digits.replace(/\D/g, '');
}

export function validateMyanmarPhone(value: string): string | undefined {
  const digits = normalizeMyanmarPhone(value);
  if (!digits) return 'Please enter a phone number.';
  if (!/^09\d{7,9}$/.test(digits)) {
    return 'Use a Myanmar mobile number (e.g. 09 971 234 567).';
  }
  return undefined;
}

export function validateAddressLabel(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter a label (e.g. Home or Office).';
  if (trimmed.length < 2) return 'Label looks too short.';
  if (trimmed.length > 40) return 'Label must be 40 characters or fewer.';
  return undefined;
}

export function validateStreetAddress(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter the street address.';
  if (trimmed.length < 5) return 'Street address looks incomplete.';
  if (trimmed.length > 200) return 'Street address must be 200 characters or fewer.';
  return undefined;
}

export function validateZipCode(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined; // optional
  if (!/^\d{4,6}$/.test(trimmed)) return 'Zip code should be 4–6 digits.';
  return undefined;
}

export function validateDeliveryZone(value: string): string | undefined {
  if (!DELIVERY_ZONES.includes(value as (typeof DELIVERY_ZONES)[number])) {
    return 'Please choose a delivery zone.';
  }
  return undefined;
}

export function validateDeliveryAddress(values: {
  name: string;
  addressLine: string;
  phone: string;
  zipCode?: string;
  zone: string;
}): AddressFieldErrors {
  const errors: AddressFieldErrors = {
    name: validateAddressLabel(values.name),
    addressLine: validateStreetAddress(values.addressLine),
    phone: validateMyanmarPhone(values.phone),
    zipCode: validateZipCode(values.zipCode ?? ''),
    zone: validateDeliveryZone(values.zone),
  };
  (Object.keys(errors) as (keyof AddressFieldErrors)[]).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return errors;
}

export function hasAddressErrors(errors: AddressFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Wallet phone (KBZPay / WavePay / AYA / MMQR). */
export function validateWalletAccount(
  type: string,
  accountName: string,
  accountNumber: string,
): { holder?: string; account?: string } {
  const errors: { holder?: string; account?: string } = {};
  if (!accountName.trim() || accountName.trim().length < 2) {
    errors.holder = 'Enter the account holder name.';
  }
  if (type !== 'mpu') {
    const phoneErr = validateMyanmarPhone(accountNumber);
    if (phoneErr) errors.account = phoneErr;
  }
  return errors;
}

export function toDeliveryAddress(
  values: {
    name: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    zone: string;
  },
  id: string,
  isDefault: boolean,
): DeliveryAddress {
  return {
    id,
    name: values.name.trim(),
    addressLine: `${values.addressLine.trim()} (${values.zone})`,
    city: values.city.trim() || 'Yangon',
    state: values.state.trim() || 'Yangon Region',
    zipCode: values.zipCode.trim() || '11201',
    phone: normalizeMyanmarPhone(values.phone),
    isDefault,
  };
}
