import * as glob from 'glob-promise';
import {homedir} from 'os';
import {basename, dirname, isAbsolute, normalize, resolve, sep} from 'path';
import {safeLoad} from 'js-yaml';
import {promisify} from 'util';
import {copyFile, exists, mkdir, readdir, readFile, rename, rmdir, stat, unlink} from 'fs';

const unlinkAsync = promisify(unlink);
const existsAsync = promisify(exists);
const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);
const rmdirAsync = promisify(rmdir);
const readFileAsync = promisify(readFile);
const renameAsync = promisify(rename);
const copyFileAsync = promisify(copyFile);

export class FSUtil {
    /**
     * Check if path exists
     * @param {string} path
     * @return {Promise<boolean>}
     */
    static async exists(path: string): Promise<boolean> {
        return await existsAsync(path);
    }

    /**
     * Find files by mask
     * @param {string[]} masks
     * @param {string[]} ignore
     * @param {string} wd
     * @return {Promise<string[]>}
     */
    static async findFilesByMasks(masks: string[], ignore: string[], wd: string): Promise<string[]> {
        const result = <string[]>[];

        for (const mask of masks) {
            const absolutePathMask = FSUtil.getAbsolutePath(mask, wd);
            const matches = await glob(absolutePathMask, {
                ignore: (ignore || []).map(i => FSUtil.getAbsolutePath(i, wd)),
                nodir: true,
                absolute: true,
                dot: true
            });

            result.push(...matches);
        }

        return result;
    }

    /**
     * Get absolute based on current working directory
     * @param {string} path
     * @param {string} wd Working Directory
     * @return {string}
     */
    static getAbsolutePath(path: string, wd: string): string {
        if (path.indexOf('~') === 0) {
            return resolve(homedir(), path.substring(2));
        }


        if (isAbsolute(path)) {
            return path;
        }

        return resolve(wd, path);
    }

    static async readFile(file: string): Promise<Buffer> {
        return await readFileAsync(file);
    }

    /**
     * Get text file content
     * @param {string} file
     * @param {BufferEncoding} [encoding]
     * @return {Promise<string>}
     */
    static async readTextFile(file: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        return (await FSUtil.readFile(file)).toString(encoding);
    }

    /**
     * Create directory and all its parents recursively
     * @param {string} path
     * @return {Promise<void>}
     */
    static async mkdirp(path: string): Promise<void> {
        const exist = await existsAsync(path);
        if (!exist) {
            path = normalize(path);
            const parent = dirname(path);

            /* istanbul ignore else */
            if (parent !== path) {
                await this.mkdirp(parent);
                await promisify(mkdir)(path);
            }
        } else {
            const directory = await FSUtil.isDirectory(path);
            if (!directory) {
                throw new Error(`Unable to create folder at path: ${path}. Path already exists and it is not a folder.`);
            }
        }
    }

    /**
     * Remove files and folders at given path recursively
     * @param {string} path
     * @param {boolean} skipNotFound do not rise exception if file no longer exists
     * @return {Promise<void>}
     */
    static async remove(path: string, skipNotFound = false): Promise<void> {
        if (!await existsAsync(path)) {
            if (skipNotFound) {
                return;
            }

            throw new Error(`Unable to find file or folder at path: ${path}`);
        }

        const directory = await FSUtil.isDirectory(path);
        if (!directory) {
            await unlinkAsync(path);
        } else {
            const children = await readdirAsync(path);
            for (const child of children) {
                await FSUtil.remove(resolve(path, child));
            }
            await rmdirAsync(path);
        }
    }

    /**
     * Check if path represents a directory
     * @param {string} path
     * @return {Promise<boolean>}
     */
    static async isDirectory(path: string): Promise<boolean> {
        const stats = await statAsync(path);

        return stats.isDirectory();
    }

    /**
     * Move file/folder
     * @param {string} from
     * @param {string} to
     * @return {Promise<void>}
     */
    static async move(from: string, to: string): Promise<void> {
        if (!await existsAsync(from)) {
            throw new Error(`Unable to find file or folder at path: ${from}`);
        }

        const directory = await FSUtil.isDirectory(from);
        if (!directory) {
            // if destination path has an OS specific path separator in the end
            if (to.endsWith(sep)) {
                // create folders first
                await FSUtil.mkdirp(to);

                // move file preserving its original name
                await renameAsync(from, resolve(to, basename(from)));
            } else {
                // create folders first
                await FSUtil.mkdirp(dirname(to));

                // move file ignoring its name
                await renameAsync(from, to);
            }
        } else {
            // if source path has an OS specific path separator in the end
            if (from.endsWith(sep)) {
                // move its content instead of the folder itself
                const children = await readdirAsync(from);
                for (const child of children) {
                    await FSUtil.move(resolve(from, child), normalize(to) + sep);
                }
            } else {
                // if destination path has an OS specific path separator in the end
                if (to.endsWith(sep)) {
                    // create folders first
                    await FSUtil.mkdirp(to);

                    // move folder preserving its original name
                    await renameAsync(from, resolve(to, basename(from)));
                } else {
                    // create folders first
                    await FSUtil.mkdirp(dirname(to));

                    // move folder ignoring its name
                    await renameAsync(from, to);
                }
            }
        }
    }

    /**
     * Copy file/folder
     * @param {string} from
     * @param {string} to
     * @return {Promise<void>}
     */
    static async copy(from: string, to: string): Promise<void> {
        if (!await existsAsync(from)) {
            throw new Error(`Unable to find file or folder at path: ${from}`);
        }

        const directory = await FSUtil.isDirectory(from);
        if (!directory) {
            // if destination path has an OS specific path separator in the end
            if (to.endsWith(sep)) {
                // create folders first
                await FSUtil.mkdirp(to);

                // copy file preserving its original name
                await copyFileAsync(from, resolve(to, basename(from)));
            } else {
                // create folders first
                await FSUtil.mkdirp(dirname(to));

                // copy file ignoring its name
                await copyFileAsync(from, to);
            }
        } else {
            // if source path has an OS specific path separator in the end
            if (from.endsWith(sep)) {
                // copy its content instead of the folder itself
                const children = await readdirAsync(from);
                for (const child of children) {
                    await FSUtil.copy(resolve(from, child), normalize(to) + sep);
                }
            } else {
                let destination: string;
                // if destination path has an OS specific path separator in the end
                if (to.endsWith(sep)) {
                    // create folders first
                    destination = resolve(to, basename(from));
                } else {
                    destination = to;
                }

                await FSUtil.mkdirp(destination);

                // copy its content instead of the folder itself
                const children = await readdirAsync(from);
                for (const child of children) {
                    await FSUtil.copy(resolve(from, child), destination + sep);
                }
            }
        }
    }

    /**
     * Read and parse yaml file
     * @param {string} file
     * @returns {Promise<any>}
     */
    static async readYamlFromFile(file: string): Promise<any> {
        const source = await FSUtil.readTextFile(file);

        return safeLoad(source);
    }
}
