/// <reference path="./node_modules/@types/node/index.d.ts" />

import * as chokidar from "chokidar";
import * as fs from "fs";
import { parse, NodeKind, ProgNode, CodeNode, ViewNode, MemberNode, MemberStyle } from "./parser"


function buildClassName(member: MemberNode): string {
    let className = '';
    member.styles.forEach((style: MemberStyle) => {
        className += ` ${member.tag}_${member.name}_${style.name}`;
    });
    return member.classNames + className;
}

function emitTagMember(member: MemberNode, parent?: string) {
    const options = {
        parent: parent,
        innerHTML: member.innerHTML,
        className: buildClassName(member),
    };

    member.classNames.forEach((str: string) => options.className += ' ' + str);
    let result = `\t${member.name} = this.add('${member.tag}', ${JSON.stringify(options)});\n`;
    return result;
}

function emitViewMember(member: MemberNode, parent?: string) {
    const className = buildClassName(member);
    parent = parent ? ('this.' + parent) : 'undefined';
    let result = `\t${member.name} = this.addView(new ${member.tag}(${member.options}), '${className}', ${parent});\n`;
    return result;
}

function emit(prog: ProgNode[]) {
    let result = 'import { SyncNode } from "syncnode-common";\n';
    result += 'import { SyncView, SyncList, SyncUtils } from "syncnode-client";\n\n';
    prog.forEach((node) => {
        switch (node.kind) {
            case NodeKind.Code:
                result += (node as CodeNode).code + '\n';
                break;
            case NodeKind.View:
                result = emitView(node as ViewNode, result);
                break;
            default:
                console.error('Unknown NodeKind', node.kind);
                break;
        }
    });

    prog.forEach((node) => {
        if (node.kind === NodeKind.View) {
            let view = node as ViewNode;
            let name: string;
            view.styles.forEach((style) => {
                name = view.name + '_' + style.name;
                result += `SyncView.addGlobalStyle('.${name}', \`${style.text}\`);\n`
            });
        }
    });

    return result;
}

function emitMember(member: MemberNode, result: string): string {
    member.functions.filter(func => func.name.substr(0, 2) == 'on').forEach((func) => {
        const name = func.name.substr(2, func.name.length - 2).toLowerCase();
        switch (member.type) {
            case 'tag':
                result += `\t\tthis.${member.name}.addEventListener('${name}', (${func.args}) => { ${func.code} });\n`;
                break;
            case 'view':
                result += `\t\tthis.${member.name}.on('${name}', (${func.args}) => { ${func.code} });\n`;
                break;
            default:
                console.error('Unknown member type: ' + member.type);
                break;
        }
    });

    member.bindings.forEach((binding) => {
        result += `\t\tthis.addBinding('${member.name}', '${binding.prop}', '${binding.value}');\n`;
    });

    member.members.forEach((member2) => {
        result = emitMember(member2, result);
    });

    return result;
}

function emitMemberDecleration(member: MemberNode, parent?: string): string {
    let result = member.type === 'view' ? emitViewMember(member, parent) : emitTagMember(member, parent);
    if(member.members.length) console.log('----------------------', member.name, member.members)
    member.members.forEach((member2) => result += emitMemberDecleration(member2, member.name));
    return result;
}

function emitView(view: ViewNode, result: string): string {
    result += `export class ${view.name} extends SyncView<${view.dataType}> {\n`;
    view.properties.forEach((property) => {
        result += property.text + '\n ';
    });
    view.members.forEach((member) => {
        result += emitMemberDecleration(member);
    });
    result += `\tconstructor(options: any = {}) {\n`;
    result += `\t\tsuper(SyncUtils.mergeMap(${view.options}, options));\n`;
    result += `\t\tthis.el.className += ' ${view.classNames}';\n`;
    view.styles.forEach((style) => {
        result += `\t\tthis.el.className += ' ${view.name}_${style.name}';\n`;
    });
    view.functions.forEach((func) => {
        if (func.name.substr(0, 2) === 'on') {
            const name = func.name.substr(2, func.name.length - 2).toLowerCase();
            result += `\t\tthis.el.addEventListener('${name}', this.${func.name}.bind(this));\n`;
        }
    });
    view.members.forEach((member) => {
        result = emitMember(member, result);
    });
    result += `\t}\n`;
    view.functions.forEach((func) => {
        result += `\t${func.name}(${func.args}) {`;
        result += `${func.code}`;
        result += `}\n`;
    });

    result += `}\n\n`;

    function emitStyle(member: MemberNode, style: MemberStyle): string {
        let name = member.tag + '_' + member.name + '_' + style.name;
        return `SyncView.addGlobalStyle('.${name}', \`${style.text}\`);\n`
    }

    function emitStyles(member: MemberNode): string {
        let result = '';
        member.styles.forEach((style) => {
            result += emitStyle(member, style);
        });
        member.members.forEach((member2) => {
            result += emitStyles(member2);
        });
        return result;
    }

    view.members.forEach((member) => {
        result += emitStyles(member);
    });

    return result;
}


function processFile(filePath: string) {
    console.log('Processing:', filePath);
    fs.readFile(filePath, function read(err, data) {
        if (err) {
            throw err;
        }

        try {
            let prog = parse(data.toString());
            let transpiled = emit(prog);
            let path = filePath.replace('.svml', '.ts');
            fs.writeFile(path, transpiled);
        } catch (msg) {
            console.error(msg)
        }
    });
}

if (process.argv.length > 2) {
    let watchPath = process.argv[2];
    chokidar.watch(watchPath, { depth: 99 }).on('change', (filePath: string) => {
        if (filePath.match(/\.svml$/i) !== null) {
            console.log('SVML file changed ', filePath);
            processFile(filePath);
        };
    });

    //processFile(process.argv[2]);
    console.log('Watching SVML Files at ' + watchPath + '...');
} else {
    console.log('Watch path required.');
}

