import {device} from "tns-core-modules/platform";
import {Folder, knownFolders, File, FileSystemEntity} from "tns-core-modules/file-system";
import {VERSIONS_COLLECTION} from "../data/constants";
import {container} from "../lib/di";

const xLog = (...args) => container.xLog(...args);
const collection = (...args) => container.collection(...args);
const snapshotToArray = (...args) => container.snapshotToArray(...args);

interface ENV {
    deviceLocale: string,
    deviceFullLocale: string,
    defaultLocale?: string,
    selectedLocale?: string,
    localeData: Locale,
}

interface Locale {
    [index: string]: string,
}

interface Versions {
    [index: string]: number
}

const I18N = "i18n";
const deviceFullLocale = device.language;
const deviceLocale = deviceFullLocale.slice(0, 2);
const VERSIONS_FILE = "versions.json";

const env: ENV = {
    deviceFullLocale,
    deviceLocale,
    localeData: {}
};

const currentApp: Folder = <Folder>knownFolders.currentApp();
const documents: Folder = <Folder>knownFolders.documents();
const appFolder: Folder = <Folder>currentApp.getFolder(I18N);
const documentsFolder: Folder = <Folder>documents.getFolder(I18N);

export function checkLocale() {
    return copyVersions()
        .catch(err => {
            xLog(
                "copyVersions error",
                err,
            );
            throw err;
        })
        .then(() => {
            return checkForUpdates()
        })
        .catch(err => {
            xLog(
                "checkForUpdates error",
                err,
            )
        })
        .then(() => {
            return loadLocaleFromFile(env.deviceFullLocale)
        })
        .then(localeFromFile => {
            if (localeFromFile) {
                setLocale(env.deviceFullLocale, localeFromFile)
            } else {
                return loadLocaleFromFile(env.deviceLocale)
            }
        })
        .then(localeFromFile => {
            if (!env.selectedLocale) {
                if (localeFromFile) {
                    setLocale(env.deviceLocale, localeFromFile)
                } else {
                    return loadDefaultLocale()
                }
            }
        })
        .catch(err => {
            xLog(
                "checkLocale error",
                err,
                err.stack,
            );
            throw err;
        })
}

function copyVersions() {
    if (!documentsFolder.contains(VERSIONS_FILE)) {
        const appFile = <File>appFolder.getFile(VERSIONS_FILE);
        const documentsFile = <File>documentsFolder.getFile(VERSIONS_FILE);
        return appFile.readText().then(fileData => {
            return documentsFile.writeText(fileData)
        })
    }
    return Promise.resolve()
}

function loadLocaleFromFile(locale: string) {
    const fileName = `${locale}.json`;
    const defaultFileName = `${locale}.default.json`;
    if (documentsFolder.contains(fileName) || documentsFolder.contains(defaultFileName)) {
        return loadLocaleFromFolder(
            fileName,
            defaultFileName,
            documentsFolder,
        )
    }
    if (appFolder.contains(fileName) || appFolder.contains(defaultFileName)) {
        return loadLocaleFromFolder(
            fileName,
            defaultFileName,
            appFolder,
        )
    }
}

function loadLocaleFromFolder(fileName: string, defaultFileName: string, folder: Folder) {
    return safeLoadFileFromFolder(fileName, folder)
        .then(fileData => {
            if (String(fileData).trim()) {
                return JSON.parse(String(fileData))
            } else {
                return safeLoadFileFromFolder(defaultFileName, folder)
                    .then(defaultData => {
                        if (String(defaultData).trim()) {
                            return JSON.parse(String(defaultData))
                        }
                    })
            }
        })
}

function safeLoadFileFromFolder(fileName: string, folder: Folder) {
    if (folder.contains(fileName)) {
        return folder.getFile(fileName).readText()
    }
    return Promise.resolve('')
}

function loadLocaleFromServer(locale: string) {
    return collection(I18N).doc(locale)
        .get()
        .then((querySnaphot) => {
            return snapshotToArray(querySnaphot)
        })
}

function setLocale(locale: string, data: string) {
    env.selectedLocale = locale;
    env.localeData = typeof data == "string" ? JSON.parse(data) : data;
}

function loadDefaultLocale() {
    let defaultLocale = "";
    appFolder.eachEntity((entity: FileSystemEntity) => {
        const name = entity.name;
        const isDefault = name.includes("default");
        if (isDefault) {
            defaultLocale = name.replace(".default.json", "");
        }
        return !isDefault
    });
    return loadLocaleFromFile(defaultLocale).then(fileData => {
        if (fileData) {
            setLocale(defaultLocale, fileData);
            env.defaultLocale = defaultLocale
        }
    })
}

function checkForUpdates() {
    return Promise.all(
        [
            loadServerVersions(),
            loadLocalVersions(),
        ]
    ).then(([localVersions, serverVersions]) => {
        const locales = [env.deviceLocale, env.deviceFullLocale];
        if (env.defaultLocale) {
            locales.push(env.defaultLocale)
        }
        const versionUpdates = { ...localVersions };
        const updatePromises = [];
        let updated = false;
        for (const locale of locales) {
            if (localVersions[locale] != serverVersions[locale]) {
                versionUpdates[locale] = Math.max(localVersions[locale], serverVersions[locale]);
                updated = true;
                updatePromises.push(
                    updateLocale(locale)
                )
            }
        }
        if (updated) {
            updatePromises.push(
                writeLocalVersions(
                    versionUpdates,
                )
            )
        }
        return updatePromises
    })
}

function updateLocale(locale: string) {
    return loadLocaleFromServer(locale).then(serverData => {
        if (locale == env.selectedLocale) {
            env.localeData = serverData
        }
        return writeLocaleData(locale, serverData)
    })
}

function writeLocaleData(locale: string, data) {
    let file = <File>documentsFolder.getFile(`${locale}.json`);
    if (env.defaultLocale == locale) {
        file = <File>documentsFolder.getFile(`${locale}.default.json`);
    }
    return file.writeText(
        JSON.stringify(data)
    )
}

function loadLocalVersions() {
    const file = <File>documentsFolder.getFile(VERSIONS_FILE);
    return file.readText().then(fileData => {
        if (fileData) {
            return JSON.parse(fileData)
        } else {
            return {}
        }
    })
}

function writeLocalVersions(versions: Versions) {
    const file = <File>documentsFolder.getFile(VERSIONS_FILE);
    return file.writeText(
        JSON.stringify(
            versions
        )
    )
}

function loadServerVersions() {
    return collection(VERSIONS_COLLECTION)
        .doc(I18N)
        .get()
        .then(snapshot => {
            return snapshotToArray(snapshot)
        })
}

export function localize(key: string, defaultValue?: string) {
    return String(env.localeData[key] || defaultValue)
        .replace(/\${(.*)}/g, (_, formatter) => {
            if (container[formatter]) {
                return container[formatter]()
            }
            return ''
        })
}

export function getLocale() {
    return env.selectedLocale || deviceLocale
}

export function getShortLocale() {
    return getLocale().slice(0, 2).toLocaleLowerCase();
}