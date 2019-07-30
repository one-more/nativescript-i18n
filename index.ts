import { checkLocale } from './services/locale';
import { container } from './lib/di';

export function initI18N(inject: object) {
    Object.assign(container, inject);

    return checkLocale();
}

export * from './services/locale';
export * from './lib/utils';
