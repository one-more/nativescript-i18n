import { getShortLocale } from '../services/locale';
const Polyglot = require('node-polyglot');
const moment = require('moment');

const locale = getShortLocale();
const polyglot = new Polyglot({ locale });
moment.locale(locale);

const polyglotExtensions = {};

export function getLocalizedMonth(index: number): string {
    return moment.months(index);
}

export function getPluralizedMonthForDate(date: Date): string {
    return moment(date)
        .format('D MMMM')
        .replace(/\d+/, '')
        .trim();
}

export function getLocalizedShortMonth(index: number): string {
    return moment.monthsShort(index);
}

export function getLocalizedDayNameShort(index: number): string {
    return moment.weekdaysShort(index);
}

export function getLocalizedDayNamesShort(): string {
    return moment.weekdaysShort();
}

export function getLocalizedDayName(index: number): string {
    return moment.weekdays(index);
}

export function getLocalizedDayNames(): string {
    return moment.weekdays();
}

export function pluralize(
    key: string,
    forms: string,
    smartCount: number,
): string {
    if (!polyglotExtensions[key]) {
        polyglotExtensions[key] = forms;
        polyglot.extend(polyglotExtensions);
    }
    // eslint-disable-next-line @typescript-eslint/camelcase
    return polyglot.t(key, { smart_count: smartCount });
}
