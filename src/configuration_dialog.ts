/// <reference path="dialog.ts"/>

module PoseEditor {
    export module Screen {
        interface DomAction {
            destruction: () => void;
            crawl: (table: {[key: string]: any}) => void;
        }

        export class ConfigurationDialog extends Dialog<HTMLDivElement> {
            constructor(parentDom: HTMLElement, hasCancel: boolean = true) {
                super(parentDom, 'div', 'poseeditor-config-dialog');

                // container element
                this.containerDom = document.createElement("div");
                {
                    var d = this.containerDom;
                    d.className = 'container';
                }
                this.coreDom.appendChild(this.containerDom);

                // selection element
                this.selectionDom = document.createElement("div");
                {
                    var d = this.selectionDom;
                    d.className = 'selection';

                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'OK';
                        dom.className = 'ok';
                        dom.addEventListener("click", () => {
                            var table: {[key: string]: any} = {};
                            this.getElementValues(table);
                            this.disposeAllElements();

                            this.dispatchCallback('onsubmit', table);
                            this.hide();
                        });

                        d.appendChild(dom);
                    }

                    if (hasCancel) {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'Cancel';
                        dom.className = 'cancel';
                        dom.addEventListener("click", () => {
                            this.disposeAllElements();

                            this.dispatchCallback('oncancel');
                            this.hide();
                        });

                        d.appendChild(dom);
                    }
                }
                this.coreDom.appendChild(this.selectionDom);
            }

            public setValues(data: Array<any>) {
                if (data) {
                    data.forEach((v: any) => {
                        var type = <string>v.type;
                        var name = <string>v.name;

                        switch(type) {
                        case 'radio':
                            this.addElement(
                                name,
                                (wrapperDom: HTMLElement) => {
                                    // construct radio boxes
                                    var num = <number>v.value.length;

                                    for( var i=0; i<num; ++i ) {
                                        var value = v.value[i];
                                        var label = v.label[i];

                                        var labelDom
                                            = document.createElement("label");
                                        labelDom.innerText = label;

                                        var inputDom
                                            = document.createElement("input");
                                        inputDom.type = 'radio';
                                        inputDom.name = 'poseeditor-' + name;
                                        inputDom.value = value;
                                        if ( v.selectedValue ) {
                                            if ( value == v.selectedValue ) {
                                                inputDom.checked = true;
                                            }
                                        }

                                        labelDom.appendChild(inputDom);
                                        wrapperDom.appendChild(labelDom);
                                    }
                                },
                                () => {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var radios
                                        = document.getElementsByName(domName);

                                    var format = "";
                                    for( var i=0; i<radios.length; ++i ) {
                                        var radio = <HTMLInputElement>radios[i];
                                        if ( radio.checked ) {
                                            format = radio.value;
                                            break;
                                        }
                                    }

                                    return format;
                                }
                            );
                            break;

                        case 'select':
                            this.addElement(
                                name,
                                (wrapperDom: HTMLElement) => {
                                    // construct select/options
                                    var num = <number>v.value.length;

                                    var selectDom
                                        = document.createElement("select");
                                    selectDom.name = 'poseeditor-' + name;

                                    for( var i=0; i<num; ++i ) {
                                        var value = v.value[i];
                                        var label = v.label[i];

                                        var optionDom
                                            = document.createElement("option");
                                        optionDom.value = value;
                                        optionDom.innerText = label;

                                        if ( v.selectedValue ) {
                                            if ( value == v.selectedValue ) {
                                                optionDom.selected = true;
                                            }
                                        }

                                        selectDom.appendChild(optionDom);
                                    }

                                    wrapperDom.appendChild(selectDom);
                                },
                                () => {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var selects
                                        = document.getElementsByName(domName);
                                    if ( selects.length != 1 ) {
                                        // TODO: throw exception
                                        console.warn("");
                                    }

                                    var select = <HTMLSelectElement>selects[0];
                                    var index = select.selectedIndex;

                                    return select.options[index].value;
                                }
                            );
                            break;

                        case 'input':
                            this.addElement(
                                name,
                                (wrapperDom: HTMLElement) => {
                                    // construct input box
                                    var labelDom
                                        = document.createElement("label");
                                    labelDom.innerText = v.label;

                                    var inputDom
                                        = document.createElement("input");
                                    inputDom.name = 'poseeditor-' + name;
                                    inputDom.value = v.value;

                                    labelDom.appendChild(inputDom);
                                    wrapperDom.appendChild(labelDom);
                                },
                                () => {
                                    // result collector
                                    var domName = 'poseeditor-' + name;
                                    var selects
                                        = document.getElementsByName(domName);
                                    if ( selects.length != 1 ) {
                                        // TODO: throw exception
                                        console.warn("");
                                    }

                                    var input = <HTMLInputElement>selects[0];

                                    return input.value;
                                }
                            );
                            break;

                        case 'message':
                            this.addElement(
                                name,
                                (wrapperDom: HTMLElement) => {
                                    // construct input box
                                    var labelDom
                                        = document.createElement("label");
                                    labelDom.innerText = v.text;

                                    wrapperDom.appendChild(labelDom);
                                },
                                () => {
                                    return null;
                                }
                            );
                            break;

                        default:
                            console.warn('unsupported: ' + type);
                            break;
                        }
                    });
                }
            }

            private addElement(
                name: string,
                createDom: (wrapper: HTMLElement) => void,
                clawlAction: () => any
            ) {
                //
                var wrapperDom = document.createElement("div");
                createDom(wrapperDom);
                this.containerDom.appendChild(wrapperDom);

                //
                var action = {
                    destruction: () => {
                        this.containerDom.removeChild(wrapperDom);
                    },
                    crawl: (table: any) => {
                        var result = clawlAction();
                        table[name] = result;
                    }
                };
                this.actions.push(action);
            }

            private disposeAllElements() {
                this.actions.forEach((a) => a.destruction());
                this.actions = [];
            }

            private getElementValues(table: {[key: string]: any}) {
                this.actions.forEach((a) => a.crawl(table));
            }

            private containerDom: HTMLElement;
            private selectionDom: HTMLElement;

            private actions: Array<DomAction> = [];
        }
    }
}