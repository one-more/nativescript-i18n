import {getShortLocale} from "../services/locale";
const Polyglot = require("node-polyglot");
const moment = require("moment");

const locale = getShortLocale();
const polyglot = new Polyglot({ locale });
moment.locale(locale);

const polyglotExtensions = {};

export function getLocalizedShortMonth(index: number) {
    return moment.monthsShort(index)
}

export function getLocalizedDayNameShort(index: number) {
    return moment.weekdaysShort(index)
}

export function getLocalizedDayName(index: number) {
    return moment.weekdays(index)
}

export function pluralize(key: string, forms: string, smart_count: number) {
    if (!polyglotExtensions[key]) {
        polyglotExtensions[key] = forms;
        polyglot.extend(polyglotExtensions)
    }
    return polyglot.t(key, { smart_count })
}