/// <reference path="./node_modules/@types/node/index.d.ts" />
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chokidar = require("chokidar");
var fs = require("fs");
var parser_1 = require("./parser");
function buildClassName(member) {
    var className = '';
    member.styles.forEach(function (style) {
        className += " " + member.tag + "_" + member.name + "_" + style.name;
    });
    return member.classNames + className;
}
function emitTagMember(member) {
    var options = {
        innerHTML: member.innerHTML,
        className: buildClassName(member)
    };
    member.classNames.forEach(function (str) { return options.className += ' ' + str; });
    var result = "\t" + member.name + " = this.add('" + member.tag + "', " + JSON.stringify(options) + ");\n";
    return result;
}
function emitViewMember(member) {
    var className = buildClassName(member);
    var result = "\t" + member.name + " = this.addView(new " + member.tag + "(" + member.options + "), '" + className + "');\n";
    return result;
}
function emit(prog) {
    var result = 'import { SyncNode, SyncNodeSocket, SyncData } from "./SyncNode/SyncNode"\n';
    result += 'import { SyncView, SyncApp, SyncList, SyncUtils, SyncReloader } from "./SyncNode/SyncView"\n\n';
    prog.forEach(function (node) {
        switch (node.kind) {
            case parser_1.NodeKind.Code:
                result += node.code + '\n';
                break;
            case parser_1.NodeKind.View:
                result = emitView(node, result);
                break;
            default:
                console.error('Unknown NodeKind', node.kind);
                break;
        }
    });
    prog.forEach(function (node) {
        if (node.kind === parser_1.NodeKind.View) {
            var view_1 = node;
            var name_1;
            view_1.styles.forEach(function (style) {
                name_1 = view_1.name + '_' + style.name;
                result += "SyncView.addGlobalStyle('." + name_1 + "', `" + style.text + "`);\n";
            });
        }
    });
    return result;
}
function emitView(view, result) {
    result += "export class " + view.name + " extends SyncView<" + view.dataType + "> {\n";
    view.properties.forEach(function (property) {
        result += property.text + '\n ';
    });
    view.members.forEach(function (member) {
        result += member.type === 'view' ? emitViewMember(member) : emitTagMember(member);
    });
    result += "\tconstructor(options: any = {}) {\n";
    result += "\t\tsuper(options);\n";
    result += "\t\tthis.options = SyncUtils.mergeMap(" + view.defaultOptions + ", options);\n";
    result += "\t\tthis.el.className += ' " + view.classNames + "';\n";
    view.styles.forEach(function (style) {
        result += "\t\tthis.el.className += ' " + view.name + "_" + style.name + "';\n";
    });
    view.functions.forEach(function (func) {
        if (func.name.substr(0, 2) === 'on') {
            var name_2 = func.name.substr(2, func.name.length - 2).toLowerCase();
            result += "\t\tthis.el.addEventListener('" + name_2 + "', this." + func.name + ".bind(this));\n";
        }
    });
    view.members.forEach(function (member) {
        member.functions.filter(function (func) { return func.name.substr(0, 2) == 'on'; }).forEach(function (func) {
            var name = func.name.substr(2, func.name.length - 2).toLowerCase();
            switch (member.type) {
                case 'tag':
                    result += "\t\tthis." + member.name + ".addEventListener('" + name + "', (" + func.args + ") => { " + func.code + " });\n";
                    break;
                case 'view':
                    result += "\t\tthis." + member.name + ".on('" + name + "', (" + func.args + ") => { " + func.code + " });\n";
                    break;
                default:
                    console.error('Unknown member type: ' + member.type);
                    break;
            }
        });
        member.bindings.forEach(function (binding) {
            result += "\t\tthis.addBinding('" + member.name + "', '" + binding.prop + "', '" + binding.value + "');\n";
        });
    });
    result += "\t}\n";
    view.functions.forEach(function (func) {
        result += "\t" + func.name + "(" + func.args + ") {";
        result += "" + func.code;
        result += "}\n";
    });
    result += "}\n\n";
    view.members.forEach(function (member) {
        var name;
        member.styles.forEach(function (style) {
            name = member.tag + '_' + member.name + '_' + style.name;
            result += "SyncView.addGlobalStyle('." + name + "', `" + style.text + "`);\n";
        });
    });
    return result;
}
function processFile(filePath) {
    console.log('Processing:', filePath);
    fs.readFile(filePath, function read(err, data) {
        if (err) {
            throw err;
        }
        try {
            var prog = parser_1.parse(data.toString());
            var transpiled = emit(prog);
            var path = filePath.replace('.svml', '.ts');
            fs.writeFile(path, transpiled);
        }
        catch (msg) {
            console.error(msg);
        }
    });
}
if (process.argv.length > 2) {
    var watchPath = process.argv[2];
    chokidar.watch(watchPath, { depth: 99 }).on('change', function (filePath) {
        if (filePath.match(/\.svml$/i) !== null) {
            console.log('SVML file changed ', filePath);
            processFile(filePath);
        }
        ;
    });
    //processFile(process.argv[2]);
    console.log('Watching SVML Files at ' + watchPath + '...');
}
else {
    console.log('Watch path required.');
}
//# sourceMappingURL=index.js.map