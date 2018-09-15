import * as glob from 'glob-promise';
import {homedir} from 'os';
import {isAbsolute, resolve} from 'path';
import {safeLoad} from 'js-yaml';
import {promisify} from 'util';
import {readFile} from 'fs';

export class FSUtil {
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

    static async readTextFile(file: string): Promise<string> {
        return await promisify(readFile)(file, 'utf8');
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
