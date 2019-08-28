import { device } from 'tns-core-modules/platform';
import {
    Folder,
    knownFolders,
    File,
    FileSystemEntity,
} from 'tns-core-modules/file-system';
import { VERSIONS_COLLECTION } from '../data/constants';
import { container } from '../lib/di';

interface Document {
    get(): Promise<object>;
}

interface Collection {
    doc(id: string): Document;
}

const xLog = (...args): void => container.xLog(...args);
const collection = (...args): Collection =>
    container.collection(...args);
const snapshotToArray = (...args): object[] | object =>
    container.snapshotToArray(...args);

interface ENV {
    deviceLocale: string;
    deviceFullLocale: string;
    defaultLocale?: string;
    selectedLocale?: string;
    localeData: Locale;
}

interface Locale {
    [index: string]: string;
}

interface Versions {
    [index: string]: number;
}

const I18N = 'i18n';
const deviceFullLocale = device.language;
const deviceLocale = deviceFullLocale.slice(0, 2);
const VERSIONS_FILE = 'versions.json';

const env: ENV = {
    deviceFullLocale,
    deviceLocale,
    localeData: {},
};

const currentApp: Folder = knownFolders.currentApp() as Folder;
const documents: Folder = knownFolders.documents() as Folder;

const appI18NFolder: Folder = currentApp.getFolder(
    I18N,
) as Folder;
const documentsI18NFolder: Folder = documents.getFolder(
    I18N,
) as Folder;

function copyVersions(): Promise<void> {
    if (!documentsI18NFolder.contains(VERSIONS_FILE)) {
        const appFile = appI18NFolder.getFile(
            VERSIONS_FILE,
        ) as File;
        const documentsFile = documentsI18NFolder.getFile(
            VERSIONS_FILE,
        ) as File;
        return appFile.readText().then(
            (fileData): Promise<void> => {
                return documentsFile.writeText(fileData);
            },
        );
    }
    return Promise.resolve();
}

function safeLoadFileFromFolder(
    fileName: string,
    folder: Folder,
): Promise<string> {
    if (folder.contains(fileName)) {
        return folder.getFile(fileName).readText();
    }
    return Promise.resolve('');
}

function loadLocaleFromFolder(
    fileName: string,
    defaultFileName: string,
    folder: Folder,
): Promise<object> {
    return safeLoadFileFromFolder(fileName, folder).then(
        (fileData): Promise<object> => {
            if (String(fileData).trim()) {
                return JSON.parse(String(fileData));
            } else {
                return safeLoadFileFromFolder(
                    defaultFileName,
                    folder,
                ).then((defaultData): object => {
                    if (String(defaultData).trim()) {
                        return JSON.parse(String(defaultData));
                    }
                });
            }
        },
    );
}

function loadLocaleFromFile(locale: string): Promise<object> {
    const fileName = `${locale}.json`;
    const defaultFileName = `${locale}.default.json`;
    if (
        documentsI18NFolder.contains(fileName) ||
        documentsI18NFolder.contains(defaultFileName)
    ) {
        return loadLocaleFromFolder(
            fileName,
            defaultFileName,
            documentsI18NFolder,
        );
    }
    if (
        appI18NFolder.contains(fileName) ||
        appI18NFolder.contains(defaultFileName)
    ) {
        return loadLocaleFromFolder(
            fileName,
            defaultFileName,
            appI18NFolder,
        );
    }
}

function loadLocaleFromServer(locale: string): Promise<object> {
    return collection(I18N)
        .doc(locale)
        .get()
        .then((querySnaphot): object => {
            return snapshotToArray(querySnaphot);
        });
}

function setLocale(locale: string, data: string | object): void {
    env.selectedLocale = locale;
    env.localeData =
        typeof data == 'string' ? JSON.parse(data) : data;
}

function loadDefaultLocale(): Promise<void> {
    let defaultLocale = '';

    xLog(
        'search for default locale in app i18n folder. files: ' +
            appI18NFolder.getEntitiesSync().length,
    );
    xLog(
        'search for default locale in documents i18n folder. files: ' +
            documentsI18NFolder.getEntitiesSync().length,
    );

    function onFolderEntity(entity: FileSystemEntity): boolean {
        const name = entity.name;
        const isDefault = name.includes('default');
        if (isDefault) {
            defaultLocale = name.replace('.default.json', '');
        }
        xLog('i18n file', entity.name, ': ', isDefault);
        return !isDefault;
    }

    appI18NFolder.eachEntity(onFolderEntity);
    documentsI18NFolder.eachEntity(onFolderEntity);

    xLog('using default locale: ' + defaultLocale);

    return loadLocaleFromFile(defaultLocale).then(
        (fileData): void => {
            if (fileData) {
                setLocale(defaultLocale, fileData);
                env.defaultLocale = defaultLocale;
            }
        },
    );
}

function loadServerVersions(): Promise<object> {
    return collection(VERSIONS_COLLECTION)
        .doc(I18N)
        .get()
        .then((snapshot): object => {
            return snapshotToArray(snapshot);
        });
}

function loadLocalVersions(): Promise<object> {
    const file = documentsI18NFolder.getFile(
        VERSIONS_FILE,
    ) as File;
    return file.readText().then((fileData): object => {
        if (fileData) {
            return JSON.parse(fileData);
        } else {
            return {};
        }
    });
}

function writeLocaleData(locale: string, data): Promise<void> {
    let file = documentsI18NFolder.getFile(
        `${locale}.json`,
    ) as File;
    if (env.defaultLocale == locale) {
        file = documentsI18NFolder.getFile(
            `${locale}.default.json`,
        ) as File;
    }
    return file.writeText(JSON.stringify(data));
}

function updateLocale(locale: string): Promise<void> {
    return loadLocaleFromServer(locale).then(
        (serverData: Locale): Promise<void> => {
            if (locale == env.selectedLocale) {
                env.localeData = serverData;
            }
            return writeLocaleData(locale, serverData);
        },
    );
}

function writeLocalVersions(versions: Versions): Promise<void> {
    const file = documentsI18NFolder.getFile(
        VERSIONS_FILE,
    ) as File;
    return file.writeText(JSON.stringify(versions));
}

function checkForUpdates(): Promise<void> {
    return Promise.all([
        loadServerVersions(),
        loadLocalVersions(),
    ])
        .then(([localVersions, serverVersions]): Promise<
            void
        >[] => {
            const locales = [
                env.deviceLocale,
                env.deviceFullLocale,
            ];
            if (env.defaultLocale) {
                locales.push(env.defaultLocale);
            }
            const versionUpdates = { ...localVersions };
            const updatePromises = [];
            let updated = false;
            for (const locale of locales) {
                if (
                    localVersions[locale] !=
                    serverVersions[locale]
                ) {
                    versionUpdates[locale] = Math.max(
                        localVersions[locale],
                        serverVersions[locale],
                    );
                    updated = true;
                    updatePromises.push(updateLocale(locale));
                }
            }
            if (updated) {
                updatePromises.push(
                    writeLocalVersions(versionUpdates),
                );
            }
            return updatePromises;
        })
        .then((): void => {});
}

export function checkLocale(): Promise<void> {
    xLog('device locale: ' + env.deviceFullLocale);

    return copyVersions()
        .catch((err): void => {
            xLog('copyVersions error', err);
            throw err;
        })
        .then(
            (): Promise<void> => {
                return checkForUpdates();
            },
        )
        .catch((err): void => {
            xLog('checkForUpdates error', err);
        })
        .then(
            (): Promise<object> => {
                return loadLocaleFromFile(env.deviceFullLocale);
            },
        )
        .then(
            (localeFromFile): Promise<object> => {
                if (localeFromFile) {
                    setLocale(
                        env.deviceFullLocale,
                        localeFromFile,
                    );
                } else {
                    return loadLocaleFromFile(env.deviceLocale);
                }
            },
        )
        .then(
            (localeFromFile): Promise<void> => {
                if (!env.selectedLocale) {
                    if (localeFromFile) {
                        setLocale(
                            env.deviceLocale,
                            localeFromFile,
                        );
                    } else {
                        return loadDefaultLocale();
                    }
                }
            },
        )
        .catch((err): void => {
            xLog('checkLocale error', err, err.stack);
            throw err;
        });
}

export function localize(
    key: string,
    defaultValue?: string,
): string {
    return String(env.localeData[key] || defaultValue).replace(
        /\${(.*)}/g,
        (_, formatter): string => {
            if (container[formatter]) {
                return container[formatter]();
            }
            return _;
        },
    );
}

export function getLocale(): string {
    return env.selectedLocale || deviceLocale;
}

export function getShortLocale(): string {
    return getLocale()
        .slice(0, 2)
        .toLocaleLowerCase();
}
