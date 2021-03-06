var PoseEditor;
(function (PoseEditor) {
    var Action = (function () {
        function Action(e) {
            this.editor = e;
        }
        Action.prototype.name = function () {
            return "";
        };
        Action.prototype.onActive = function () {
        };
        Action.prototype.onDestroy = function () {
        };
        Action.prototype.onTapStart = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onMoving = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onTapEnd = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.onDoubleTap = function (e, isTouch, isActive) {
            return true;
        };
        Action.prototype.update = function (model) {
            return true;
        };
        return Action;
    })();
    PoseEditor.Action = Action;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PoseEditor;
(function (PoseEditor) {
    var CameraAction = (function (_super) {
        __extends(CameraAction, _super);
        function CameraAction(e, c) {
            _super.call(this, e);
            this.controls = c;
        }
        CameraAction.prototype.name = function () {
            return "camera";
        };
        CameraAction.prototype.onActive = function () {
            this.controls.enabled = true;
        };
        CameraAction.prototype.onTapStart = function (e, isTouch, isActive) {
            this.controls.enabled = isActive;
            if (this.controls.enabled) {
                this.controls.beginControl(e);
            }
            return true;
        };
        CameraAction.prototype.onTapEnd = function (e, isTouch) {
            return true;
        };
        return CameraAction;
    })(PoseEditor.Action);
    PoseEditor.CameraAction = CameraAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var MoveAction = (function (_super) {
        __extends(MoveAction, _super);
        function MoveAction(e) {
            _super.call(this, e);
        }
        MoveAction.prototype.name = function () {
            return "move";
        };
        MoveAction.prototype.onDestroy = function () {
            this.releaseModel();
            this.editor.setSelectedModel(null);
        };
        MoveAction.prototype.onTapStart = function (e, isTouch) {
            return this.catchModel(e, isTouch);
        };
        MoveAction.prototype.onMoving = function (e, isTouch) {
            return this.moveModel(e, isTouch);
        };
        MoveAction.prototype.onTapEnd = function (e, isTouch) {
            return this.releaseModel();
        };
        MoveAction.prototype.catchModel = function (e, isTouch) {
            var mp = this.editor.selectModel(e, isTouch);
            if (mp == null) {
                this.releaseModel();
                this.editor.setSelectedModel(null);
                return true;
            }
            this.currentModel = mp[0];
            var localConfPos = mp[1];
            this.offsetOrgToBone = localConfPos.clone().sub(this.currentModel.mesh.position);
            this.editor.setSelectedModel(this.currentModel);
            this.editor.cursorHelper.setBeginState(localConfPos.clone());
            this.beforeModelStatus = this.currentModel.modelData();
            return false;
        };
        MoveAction.prototype.moveModel = function (e, isTouch) {
            if (this.currentModel == null)
                return true;
            var pos = this.editor.cursorToWorld(e, isTouch);
            var curPos = this.editor.cursorHelper.move(pos);
            curPos.sub(this.offsetOrgToBone);
            this.currentModel.mesh.position.copy(curPos);
            return false;
        };
        MoveAction.prototype.releaseModel = function () {
            if (this.currentModel == null)
                return true;
            var currentModelStatus = this.currentModel.modelData();
            if (!PoseEditor.isEqualModelStatus(this.beforeModelStatus, currentModelStatus)) {
                this.editor.history.didAction(new PoseEditor.TimeMachine.ChangeModelStatusAction(this.currentModel, this.beforeModelStatus, currentModelStatus));
            }
            this.currentModel = null;
            return false;
        };
        return MoveAction;
    })(PoseEditor.Action);
    PoseEditor.MoveAction = MoveAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var BoneAction = (function (_super) {
        __extends(BoneAction, _super);
        function BoneAction(e, ctrls) {
            _super.call(this, e);
            this.isOnManipurator = false;
            this.isMoving = false;
            this.transformCtrl = ctrls;
        }
        BoneAction.prototype.name = function () {
            return "bone_action";
        };
        BoneAction.prototype.onActive = function () {
            var _this = this;
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.setSize(0.8);
            this.transformCtrl.addEventListener('change', function () { return _this.onTransformCtrl(); });
            this.transformCtrl.detach();
            this.editor.showAllMarkerSprite();
        };
        BoneAction.prototype.onDestroy = function () {
            this.releaseJoint();
            this.editor.setSelectedBoneAndModel(null, null);
            this.editor.hideAllMarkerSprite();
        };
        BoneAction.prototype.onTapStart = function (e, isTouch) {
            if (this.isOnManipurator)
                return false;
            var isLeftClick = isTouch ? true : (e.button == 0);
            this.catchJoint(this.editor.selectJointMarker(e, isTouch));
            if (this.currentJointMarker == null) {
                return true;
            }
            this.beforeModelStatus = this.model.modelData();
            if (isLeftClick) {
                this.isMoving = true;
                this.hideManipurator();
            }
            else {
                var index = this.currentJointMarker.userData.jointIndex;
                this.model.toggleIKPropagation(index);
            }
            return false;
        };
        BoneAction.prototype.onMoving = function (e, isTouch) {
            return this.moving(e, isTouch);
        };
        BoneAction.prototype.onTapEnd = function (e, isTouch) {
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            this.isMoving = false;
            var currentModelStatus = this.model.modelData();
            if (!PoseEditor.isEqualModelStatus(this.beforeModelStatus, currentModelStatus)) {
                this.editor.history.didAction(new PoseEditor.TimeMachine.ChangeModelStatusAction(this.model, this.beforeModelStatus, currentModelStatus));
            }
            return false;
        };
        BoneAction.prototype.onDoubleTap = function (e, isTouch) {
            if (this.currentJointMarker == null)
                return true;
            this.transformCtrl.attach(this.currentJointMarker);
            this.transformCtrl.update();
            return false;
        };
        BoneAction.prototype.update = function (model) {
            this.transformCtrl.update();
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            if (model == this.currentJointMarker.userData.ownerModel) {
                if (this.curPos != null) {
                    this.ik(this.bone, this.curPos);
                }
            }
            return true;
        };
        BoneAction.prototype.catchJoint = function (m) {
            this.currentJointMarker = m;
            if (this.currentJointMarker == null) {
                this.releaseJoint();
                this.editor.setSelectedBoneAndModel(null, null);
                return;
            }
            this.model = this.currentJointMarker.userData.ownerModel;
            this.bone = this.model.mesh.skeleton.bones[this.currentJointMarker.userData.jointIndex];
            this.editor.selectMarkerSprite(this.currentJointMarker);
            this.editor.setSelectedBoneAndModel(this.bone, this.model);
            var pos = this.currentJointMarker.position;
            this.curPos = pos;
            this.editor.cursorHelper.setBeginState(pos);
        };
        BoneAction.prototype.moving = function (e, isTouch) {
            if (this.currentJointMarker == null || !this.isMoving)
                return true;
            this.hideManipurator();
            var pos = this.editor.cursorToWorld(e, isTouch);
            this.curPos = this.editor.cursorHelper.move(pos);
            return false;
        };
        BoneAction.prototype.releaseJoint = function () {
            this.currentJointMarker = null;
            this.isMoving = false;
            this.hideManipurator();
            this.editor.cancelAllMarkerSprite();
        };
        BoneAction.prototype.hideManipurator = function () {
            this.transformCtrl.detach();
            this.isOnManipurator = false;
        };
        BoneAction.prototype.ik = function (selected_bone, target_pos) {
            var c_bone = selected_bone;
            var p_bone = c_bone.parent;
            while (p_bone != null && p_bone.type != "SkinnedMesh") {
                var t_r = p_bone.quaternion.clone();
                p_bone.rotation.set(0, 0, 0);
                p_bone.updateMatrixWorld(true);
                var w_to_l_comp_q = p_bone.getWorldQuaternion(null).inverse();
                p_bone.quaternion.copy(t_r);
                p_bone.updateMatrixWorld(true);
                var c_b_pos = c_bone.getWorldPosition(null);
                var p_b_pos = p_bone.getWorldPosition(null);
                var p_to_c_vec = c_b_pos.clone().sub(p_b_pos);
                var p_to_t_vec = target_pos.clone().sub(p_b_pos);
                var base_bone_q = p_bone.getWorldQuaternion(null);
                var bone_diff_q = new THREE.Quaternion().setFromUnitVectors(p_to_c_vec, p_to_t_vec);
                bone_diff_q.multiply(base_bone_q);
                var qm = new THREE.Quaternion();
                THREE.Quaternion.slerp(base_bone_q, bone_diff_q, qm, 0.5);
                var to_q = w_to_l_comp_q.multiply(qm).normalize();
                p_bone.quaternion.copy(to_q);
                p_bone.updateMatrixWorld(true);
                if (p_bone.userData.preventIKPropagation)
                    break;
                p_bone = p_bone.parent;
            }
        };
        BoneAction.prototype.onTransformCtrl = function () {
            this.transformCtrl.update();
            if (this.transformCtrl.axis != null) {
                this.isOnManipurator = true;
                if (this.currentJointMarker != null) {
                    var t_r = this.bone.quaternion.clone();
                    this.bone.quaternion.set(0, 0, 0, 0);
                    this.bone.updateMatrixWorld(true);
                    var w_to_l_comp_q = this.bone.getWorldQuaternion(null).inverse();
                    this.currentJointMarker.updateMatrixWorld(true);
                    var sph_q = this.currentJointMarker.getWorldQuaternion(null);
                    this.currentJointMarker.quaternion.copy(sph_q);
                    var to_q = w_to_l_comp_q.multiply(sph_q).normalize();
                    this.bone.quaternion.copy(to_q);
                    this.bone.updateMatrixWorld(true);
                }
            }
            else {
                this.isOnManipurator = false;
            }
        };
        return BoneAction;
    })(PoseEditor.Action);
    PoseEditor.BoneAction = BoneAction;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="camera_action.ts"/>
/// <reference path="move_action.ts"/>
/// <reference path="bone_action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var ActionController = (function () {
        function ActionController() {
            this.currentActions = [];
        }
        ActionController.prototype.setup = function (editor, trans, ctrls, dom) {
            var _this = this;
            this.editor = editor;
            this.transformCtrl = trans;
            this.controls = ctrls;
            var camAction = new PoseEditor.CameraAction(this.editor, this.controls);
            this.currentActions.push(camAction);
            camAction.onActive();
            dom.addEventListener('mousedown', function (e) { return _this.onTapStart(e, false); }, false);
            dom.addEventListener('touchstart', function (e) { return _this.onTapStart(e, true); }, false);
            dom.addEventListener('mousemove', function (e) { return _this.onMoving(e, false); }, false);
            dom.addEventListener('touchmove', function (e) { return _this.onMoving(e, true); }, false);
            dom.addEventListener('mouseup', function (e) { return _this.onTapEnd(e, false); }, false);
            dom.addEventListener('mouseleave', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('touchend', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('touchcancel', function (e) { return _this.onTapEnd(e, true); }, false);
            dom.addEventListener('dblclick', function (e) { return _this.onDoubleTap(e, false); }, false);
        };
        ActionController.prototype.onModeSelect = function (mode, screen) {
            var _this = this;
            switch (mode) {
                case PoseEditor.Screen.Mode.Camera:
                    this.destroyActionFrom(1);
                    screen.selectModeUI('camera');
                    break;
                case PoseEditor.Screen.Mode.Move:
                    this.makeStandardModeForm('move', function () { return new PoseEditor.MoveAction(_this.editor); });
                    screen.selectModeUI('move');
                    break;
                case PoseEditor.Screen.Mode.Bone:
                    this.makeStandardModeForm('bone_action', function () { return new PoseEditor.BoneAction(_this.editor, _this.transformCtrl); });
                    screen.selectModeUI('bone');
                    break;
                default:
                    console.error('unexpected mode');
            }
        };
        ActionController.prototype.makeStandardModeForm = function (actionName, factory) {
            if (this.currentActions.length > 1) {
                if (this.currentActions[1].name() != actionName) {
                    this.destroyActionFrom(1);
                }
                else {
                    if (this.currentActions.length == 2)
                        return;
                    this.destroyActionFrom(2);
                    return;
                }
            }
            var action = factory();
            this.currentActions.push(action);
            action.onActive();
        };
        ActionController.prototype.execActions = function (func) {
            for (var i = this.currentActions.length - 1; i >= 0; --i) {
                func(this.currentActions[i]);
            }
        };
        ActionController.prototype.dispatchActions = function (func) {
            var i = this.currentActions.length - 1;
            for (; i >= 0; --i) {
                var doNextAction = func(this.currentActions[i], true);
                if (!doNextAction)
                    break;
            }
            --i;
            for (; i >= 0; --i) {
                func(this.currentActions[i], false);
            }
        };
        ActionController.prototype.destroyActionFrom = function (index) {
            var rest = this.currentActions.splice(index, this.currentActions.length - index);
            rest.forEach(function (act) { return act.onDestroy(); });
        };
        ActionController.prototype.onTapStart = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onTapStart(e, isTouch, a); });
        };
        ActionController.prototype.onMoving = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onMoving(e, isTouch, a); });
        };
        ActionController.prototype.onTapEnd = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onTapEnd(e, isTouch, a); });
        };
        ActionController.prototype.onDoubleTap = function (e, isTouch) {
            e.preventDefault();
            this.dispatchActions(function (act, a) { return act.onDoubleTap(e, isTouch, a); });
        };
        return ActionController;
    })();
    PoseEditor.ActionController = ActionController;
})(PoseEditor || (PoseEditor = {}));
var PoseEditor;
(function (PoseEditor) {
    var EventDispatcher = (function () {
        function EventDispatcher() {
            this.events = {};
        }
        EventDispatcher.prototype.addCallback = function (type, f) {
            if (this.events[type] == null) {
                this.events[type] = [];
            }
            this.events[type].push(f);
        };
        EventDispatcher.prototype.dispatchCallback = function (type) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (this.events[type] != null) {
                this.events[type].forEach(function (f) {
                    f.apply({}, args);
                });
            }
        };
        return EventDispatcher;
    })();
    PoseEditor.EventDispatcher = EventDispatcher;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="event_dispatcher.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        var Dialog = (function (_super) {
            __extends(Dialog, _super);
            function Dialog(parentDom, tagName, className) {
                if (className === void 0) { className = 'dialog'; }
                _super.call(this);
                this.parentDom = parentDom;
                this.shadowingDom = document.createElement('div');
                this.shadowingDom.className = 'poseeditor-shadowing';
                this.parentDom.appendChild(this.shadowingDom);
                this.baseDom = document.createElement('div');
                this.baseDom.className = 'poseeditor-base-element';
                this.parentDom.appendChild(this.baseDom);
                this.coreDom = document.createElement(tagName);
                this.coreDom.className = className;
                {
                    var s = this.coreDom.style;
                    s.display = 'none';
                    s.zIndex = '999';
                }
                this.baseDom.appendChild(this.coreDom);
            }
            Dialog.prototype.show = function () {
                this.shadowingDom.style.display = 'inline-block';
                this.baseDom.style.display = 'inline-block';
                this.coreDom.style.display = 'inline-block';
                this.dispatchCallback('show');
            };
            Dialog.prototype.hide = function () {
                this.shadowingDom.style.display = 'none';
                this.baseDom.style.display = 'none';
                this.coreDom.style.display = 'none';
                this.dispatchCallback('hide');
            };
            return Dialog;
        })(PoseEditor.EventDispatcher);
        Screen.Dialog = Dialog;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="dialog.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        var ConfigurationDialog = (function (_super) {
            __extends(ConfigurationDialog, _super);
            function ConfigurationDialog(parentDom, hasCancel) {
                var _this = this;
                if (hasCancel === void 0) { hasCancel = true; }
                _super.call(this, parentDom, 'div', 'poseeditor-config-dialog');
                this.actions = [];
                this.containerDom = document.createElement("div");
                {
                    var d = this.containerDom;
                    d.className = 'container';
                }
                this.coreDom.appendChild(this.containerDom);
                this.selectionDom = document.createElement("div");
                {
                    var d = this.selectionDom;
                    d.className = 'selection';
                    {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'OK';
                        dom.className = 'ok';
                        dom.addEventListener("click", function () {
                            var table = {};
                            _this.getElementValues(table);
                            _this.disposeAllElements();
                            _this.dispatchCallback('onsubmit', table);
                            _this.hide();
                        });
                        d.appendChild(dom);
                    }
                    if (hasCancel) {
                        var dom = document.createElement("input");
                        dom.type = "button";
                        dom.value = 'Cancel';
                        dom.className = 'cancel';
                        dom.addEventListener("click", function () {
                            _this.disposeAllElements();
                            _this.dispatchCallback('oncancel');
                            _this.hide();
                        });
                        d.appendChild(dom);
                    }
                }
                this.coreDom.appendChild(this.selectionDom);
            }
            ConfigurationDialog.prototype.setValues = function (data) {
                var _this = this;
                if (data) {
                    data.forEach(function (v) {
                        var type = v.type;
                        var name = v.name;
                        switch (type) {
                            case 'radio':
                                _this.addElement(name, function (wrapperDom) {
                                    var num = v.value.length;
                                    for (var i = 0; i < num; ++i) {
                                        var value = v.value[i];
                                        var label = v.label[i];
                                        var labelDom = document.createElement("label");
                                        labelDom.innerText = label;
                                        var inputDom = document.createElement("input");
                                        inputDom.type = 'radio';
                                        inputDom.name = 'poseeditor-' + name;
                                        inputDom.value = value;
                                        if (v.selectedValue) {
                                            if (value == v.selectedValue) {
                                                inputDom.checked = true;
                                            }
                                        }
                                        labelDom.appendChild(inputDom);
                                        wrapperDom.appendChild(labelDom);
                                    }
                                }, function () {
                                    var domName = 'poseeditor-' + name;
                                    var radios = document.getElementsByName(domName);
                                    var format = "";
                                    for (var i = 0; i < radios.length; ++i) {
                                        var radio = radios[i];
                                        if (radio.checked) {
                                            format = radio.value;
                                            break;
                                        }
                                    }
                                    return format;
                                });
                                break;
                            case 'select':
                                _this.addElement(name, function (wrapperDom) {
                                    var num = v.value.length;
                                    var selectDom = document.createElement("select");
                                    selectDom.name = 'poseeditor-' + name;
                                    for (var i = 0; i < num; ++i) {
                                        var value = v.value[i];
                                        var label = v.label[i];
                                        var optionDom = document.createElement("option");
                                        optionDom.value = value;
                                        optionDom.innerText = label;
                                        if (v.selectedValue) {
                                            if (value == v.selectedValue) {
                                                optionDom.selected = true;
                                            }
                                        }
                                        selectDom.appendChild(optionDom);
                                    }
                                    wrapperDom.appendChild(selectDom);
                                }, function () {
                                    var domName = 'poseeditor-' + name;
                                    var selects = document.getElementsByName(domName);
                                    if (selects.length != 1) {
                                        console.warn("");
                                    }
                                    var select = selects[0];
                                    var index = select.selectedIndex;
                                    return select.options[index].value;
                                });
                                break;
                            case 'input':
                                _this.addElement(name, function (wrapperDom) {
                                    var labelDom = document.createElement("label");
                                    labelDom.innerText = v.label;
                                    var inputDom = document.createElement("input");
                                    inputDom.name = 'poseeditor-' + name;
                                    inputDom.value = v.value;
                                    labelDom.appendChild(inputDom);
                                    wrapperDom.appendChild(labelDom);
                                }, function () {
                                    var domName = 'poseeditor-' + name;
                                    var selects = document.getElementsByName(domName);
                                    if (selects.length != 1) {
                                        console.warn("");
                                    }
                                    var input = selects[0];
                                    return input.value;
                                });
                                break;
                            case 'message':
                                _this.addElement(name, function (wrapperDom) {
                                    var labelDom = document.createElement("label");
                                    labelDom.innerText = v.text;
                                    wrapperDom.appendChild(labelDom);
                                }, function () {
                                    return null;
                                });
                                break;
                            default:
                                console.warn('unsupported: ' + type);
                                break;
                        }
                    });
                }
            };
            ConfigurationDialog.prototype.addElement = function (name, createDom, clawlAction) {
                var _this = this;
                var wrapperDom = document.createElement("div");
                createDom(wrapperDom);
                this.containerDom.appendChild(wrapperDom);
                var action = {
                    destruction: function () {
                        _this.containerDom.removeChild(wrapperDom);
                    },
                    crawl: function (table) {
                        var result = clawlAction();
                        table[name] = result;
                    }
                };
                this.actions.push(action);
            };
            ConfigurationDialog.prototype.disposeAllElements = function () {
                this.actions.forEach(function (a) { return a.destruction(); });
                this.actions = [];
            };
            ConfigurationDialog.prototype.getElementValues = function (table) {
                this.actions.forEach(function (a) { return a.crawl(table); });
            };
            return ConfigurationDialog;
        })(Screen.Dialog);
        Screen.ConfigurationDialog = ConfigurationDialog;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var CursorPositionHelper = (function () {
        function CursorPositionHelper(scene, camera, targeter) {
            this.scene = scene;
            this.camera = camera;
            this.targeter = targeter;
            this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000, 8, 8), new THREE.MeshBasicMaterial({
                color: 0x0000ff,
                opacity: 0.2,
                transparent: true
            }));
            this.plane.visible = false;
            this.scene.add(this.plane);
            var sphereGeo = new THREE.SphereGeometry(1, 14, 14);
            var material = new THREE.MeshBasicMaterial({ wireframe: true });
            this.targetMesh = new THREE.Mesh(sphereGeo, material);
            this.targetMesh.matrixWorldNeedsUpdate = true;
            this.targetMesh.visible = false;
            this.scene.add(this.targetMesh);
            var boxGeo = new THREE.BoxGeometry(1, 1, 1);
            var boxMat = new THREE.MeshBasicMaterial({ wireframe: true });
            this.debugMesh = new THREE.Mesh(boxGeo, boxMat);
            this.debugMesh.matrixWorldNeedsUpdate = true;
            this.debugMesh.visible = false;
            this.scene.add(this.debugMesh);
        }
        CursorPositionHelper.prototype.setBeginState = function (startPos) {
            this.targetMesh.position.copy(startPos);
            this.debugMesh.position.copy(startPos);
            var c_to_p = this.targeter.target.clone().sub(this.camera.position);
            var c_to_o = startPos.clone().sub(this.camera.position);
            var n_c_to_p = c_to_p.clone().normalize();
            var n_c_to_o = c_to_o.clone().normalize();
            var l = c_to_o.length();
            var len = n_c_to_o.dot(n_c_to_p) * l;
            var tmp_pos = this.camera.position.clone();
            tmp_pos.add(c_to_p.normalize().multiplyScalar(len));
            this.plane.position.copy(tmp_pos);
            this.plane.lookAt(this.camera.position);
        };
        CursorPositionHelper.prototype.move = function (worldCursorPos) {
            var raycaster = new THREE.Raycaster(this.camera.position, worldCursorPos.clone().sub(this.camera.position).normalize());
            var intersects = raycaster.intersectObject(this.plane);
            if (intersects.length == 0)
                return;
            var pos = intersects[0].point;
            this.targetMesh.position.copy(pos);
            return pos;
        };
        return CursorPositionHelper;
    })();
    PoseEditor.CursorPositionHelper = CursorPositionHelper;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Config = (function () {
        function Config() {
            this.enableBackgroundAlpha = false;
            this.backgroundColorHex = 0x777777;
            this.backgroundAlpha = 1.0;
            this.loadingImagePath = null;
            this.isDebugging = false;
            this.theme = 'poseeditor-default';
            this.logoConfig = null;
        }
        return Config;
    })();
    PoseEditor.Config = Config;
    (function (LogoPosition) {
        LogoPosition[LogoPosition["LeftBottom"] = 0] = "LeftBottom";
    })(PoseEditor.LogoPosition || (PoseEditor.LogoPosition = {}));
    var LogoPosition = PoseEditor.LogoPosition;
    var SpritePaths = (function () {
        function SpritePaths() {
        }
        return SpritePaths;
    })();
    PoseEditor.SpritePaths = SpritePaths;
    var ModelInfo = (function () {
        function ModelInfo() {
        }
        return ModelInfo;
    })();
    PoseEditor.ModelInfo = ModelInfo;
    var CameraConfig = (function () {
        function CameraConfig() {
            this.position = new THREE.Vector3(0, 0, 0);
            this.lookAt = new THREE.Vector3(0, 0, 0);
        }
        return CameraConfig;
    })();
    PoseEditor.CameraConfig = CameraConfig;
    function degToRad(deg) { return deg * Math.PI / 180.0; }
    PoseEditor.degToRad = degToRad;
    function radToDeg(rad) { return rad / Math.PI * 180.0; }
    PoseEditor.radToDeg = radToDeg;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="dialog.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        var LoadingDialog = (function (_super) {
            __extends(LoadingDialog, _super);
            function LoadingDialog(parentDom, imagePath) {
                _super.call(this, parentDom, 'div', 'poseeditor-loading');
                var imageDom = document.createElement('img');
                imageDom.src = imagePath;
                this.coreDom.appendChild(imageDom);
                var spanDom = document.createElement('span');
                spanDom.innerText = "Loading...";
                this.coreDom.appendChild(spanDom);
            }
            return LoadingDialog;
        })(Screen.Dialog);
        Screen.LoadingDialog = LoadingDialog;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../ext/SkeletonHelper.d.ts"/>
/// <reference path="etc.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var RotationLimitation = (function () {
        function RotationLimitation() {
            this.x = false;
            this.y = false;
            this.z = false;
        }
        return RotationLimitation;
    })();
    function isEqualModelStatus(lhs, rhs) {
        return JSON.stringify(lhs) == JSON.stringify(rhs);
    }
    PoseEditor.isEqualModelStatus = isEqualModelStatus;
    var Model = (function () {
        function Model(name, modelInfo, spritePaths, scene, scene2d, id, sceneForPicking, callback) {
            var _this = this;
            this.name = name;
            this.scene = scene;
            this.scene2d = scene2d;
            this.sceneForPicking = sceneForPicking;
            this.ready = false;
            this.disposed = false;
            this.showingMarker = false;
            this.selectedColor = 0xff0000;
            this.normalColor = 0x0000ff;
            this.mesh = null;
            this.availableBones = [];
            this.meshForPicking = null;
            this.jointMarkerSprites = [];
            this.jointMarkerMeshes = [];
            if (modelInfo.markerScale) {
                this.markerScale = modelInfo.markerScale;
            }
            else {
                this.markerScale = [12.0, 12.0];
            }
            var loader = new THREE.JSONLoader();
            loader.crossOrigin = '*';
            var f = function (geometry, materials) {
                var material;
                if (materials !== undefined) {
                    _this.defaultMat = [];
                    material = new THREE.MeshFaceMaterial(materials);
                    material.materials.forEach(function (mat) {
                        mat.skinning = true;
                        _this.defaultMat.push({
                            opacity: mat.opacity,
                            transparent: mat.transparent
                        });
                    });
                }
                else {
                    material = new THREE.MeshLambertMaterial({
                        color: 0xffffff,
                        skinning: true
                    });
                    _this.defaultMat = {
                        opacity: material.opacity,
                        transparent: material.transparent
                    };
                }
                var initPos = modelInfo.initPos;
                var initScale = modelInfo.initScale;
                _this.mesh = new THREE.SkinnedMesh(geometry, material);
                if (initPos) {
                    _this.mesh.position.set(initPos[0], initPos[1], initPos[2]);
                }
                if (initScale) {
                    _this.mesh.scale.set(initScale[0], initScale[1], initScale[2]);
                }
                _this.mesh.userData = {
                    modelData: _this
                };
                _this.scene.add(_this.mesh);
                var color = new THREE.Color();
                var pickingMaterial = new THREE.MeshBasicMaterial({
                    shading: THREE.NoShading,
                    vertexColors: THREE.NoColors,
                    color: id,
                    skinning: true
                });
                _this.meshForPicking = new THREE.SkinnedMesh(geometry, pickingMaterial);
                _this.meshForPicking.bind(_this.mesh.skeleton);
                _this.sceneForPicking.add(_this.meshForPicking);
                _this.setupAppendixData(spritePaths, modelInfo, callback);
                _this.skeletonHelper = new PoseEditor.SkeletonHelper(_this.mesh);
                _this.skeletonHelper.material.linewidth = 2;
                _this.skeletonHelper.visible = false;
                _this.scene.add(_this.skeletonHelper);
            };
            loader.load(modelInfo.modelPath, f, modelInfo.textureDir);
        }
        Model.prototype.selectionState = function (isActive) {
            var _this = this;
            if (this.defaultMat == null)
                return;
            var C = 0.7;
            if (this.mesh.material.type == 'MeshFaceMaterial') {
                this.mesh.material.materials.forEach(function (mat, i) {
                    var opacity = isActive ? C : _this.defaultMat[i].opacity;
                    var transparent = isActive ? true : _this.defaultMat[i].transparent;
                    mat.opacity = opacity;
                    mat.transparent = transparent;
                });
            }
            else {
                var opacity = isActive ? C : this.defaultMat.opacity;
                var transparent = isActive ? true : this.defaultMat.transparent;
                this.mesh.material.opacity = opacity;
                this.mesh.material.transparent = transparent;
            }
        };
        Model.prototype.setupAppendixData = function (sprite_paths, model_info, callback) {
            var _this = this;
            var bone_limits = model_info.boneLimits;
            var base_joint_id = model_info.baseJointId;
            var ikDefaultPropagation = model_info.ikDefaultPropagation;
            var hiddenJoints = model_info.hiddenJoints;
            var default_cross_origin = THREE.ImageUtils.crossOrigin;
            THREE.ImageUtils.crossOrigin = '*';
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                bone.matrixWorldNeedsUpdate = true;
                bone.updateMatrixWorld(true);
                bone.userData = {
                    index: index,
                    initQuaternion: bone.quaternion.clone(),
                    preventIKPropagation: !ikDefaultPropagation,
                    rotLimit: new RotationLimitation(),
                    rotMin: null,
                    rotMax: null
                };
                if (index in bone_limits) {
                    bone.userData.rotMin = new THREE.Euler();
                    bone.userData.rotMax = new THREE.Euler();
                    var rots = bone_limits[index];
                    if (rots[0] != null) {
                        bone.userData.rotLimit.x = true;
                        bone.userData.rotMin.x = PoseEditor.degToRad(rots[0][0]);
                        bone.userData.rotMax.x = PoseEditor.degToRad(rots[0][1]);
                    }
                    if (rots[1] != null) {
                        bone.userData.rotLimit.y = true;
                        bone.userData.rotMin.y = PoseEditor.degToRad(rots[1][0]);
                        bone.userData.rotMax.y = PoseEditor.degToRad(rots[1][1]);
                    }
                    if (rots[2] != null) {
                        bone.userData.rotLimit.z = true;
                        bone.userData.rotMin.z = PoseEditor.degToRad(rots[2][0]);
                        bone.userData.rotMax.z = PoseEditor.degToRad(rots[2][1]);
                    }
                }
            });
            this.scene.updateMatrixWorld(true);
            this.offsetOrgToBone
                = this.mesh.skeleton.bones[base_joint_id].getWorldPosition(null).sub(this.mesh.position);
            this.jointMarkerSprites = new Array(this.mesh.skeleton.bones.length);
            this.jointMarkerMeshes = new Array(this.mesh.skeleton.bones.length);
            this.normalMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.normal);
            this.normalMarkerMat = new THREE.SpriteMaterial({
                map: this.normalMarkerTex,
                color: this.normalColor
            });
            this.specialMarkerTex = THREE.ImageUtils.loadTexture(sprite_paths.special);
            this.specialMarkerMat = new THREE.SpriteMaterial({
                map: this.specialMarkerTex,
                color: this.normalColor
            });
            this.mesh.skeleton.bones.forEach(function (bone, index) {
                if (hiddenJoints.indexOf(index) != -1) {
                    bone.userData.hidden = true;
                    return;
                }
                else {
                    bone.userData.hidden = false;
                }
                _this.availableBones.push(bone);
                var sprite = _this.createMarkerSprite(bone);
                sprite.scale.set(_this.markerScale[0], _this.markerScale[1], 1);
                sprite.visible = false;
                _this.jointMarkerSprites[index] = sprite;
                _this.scene2d.add(sprite);
                var markerMesh = new THREE.AxisHelper(2.0);
                markerMesh.matrixWorldNeedsUpdate = true;
                markerMesh.userData = {
                    jointIndex: index,
                    ownerModel: _this
                };
                markerMesh.visible = false;
                _this.jointMarkerMeshes[index] = markerMesh;
                _this.scene.add(markerMesh);
            });
            THREE.ImageUtils.crossOrigin = default_cross_origin;
            this.ready = true;
            if (callback) {
                callback(this, null);
            }
        };
        Model.prototype.deactivate = function () {
            var _this = this;
            if (!this.ready || this.disposed) {
                return;
            }
            this.scene.remove(this.mesh);
            this.scene.remove(this.skeletonHelper);
            this.jointMarkerSprites.forEach(function (m) {
                _this.scene2d.remove(m);
            });
            this.jointMarkerMeshes.forEach(function (m) {
                _this.scene.remove(m);
            });
            this.sceneForPicking.remove(this.meshForPicking);
            this.ready = false;
        };
        Model.prototype.reactivate = function () {
            var _this = this;
            if (this.ready || this.disposed) {
                return;
            }
            this.scene.add(this.mesh);
            this.scene.add(this.skeletonHelper);
            this.jointMarkerSprites.forEach(function (m) {
                _this.scene2d.add(m);
            });
            this.jointMarkerMeshes.forEach(function (m) {
                _this.scene.add(m);
            });
            this.sceneForPicking.add(this.meshForPicking);
            this.ready = true;
        };
        Model.prototype.dispose = function () {
            if (this.disposed) {
                return;
            }
            this.deactivate();
            this.mesh.geometry.dispose();
            this.disposed = true;
        };
        Model.prototype.isReady = function () {
            return this.ready;
        };
        Model.prototype.isDisposed = function () {
            return this.disposed;
        };
        Model.prototype.update = function () {
            var _this = this;
            this.availableBones.forEach(function (bone) {
                var index = bone.userData.index;
                var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                var markerSprite = _this.jointMarkerSprites[index];
                markerSprite.position.set(b_pos.x, b_pos.y, b_pos.z);
                var markerMesh = _this.jointMarkerMeshes[index];
                markerMesh.position.set(b_pos.x, b_pos.y, b_pos.z);
                bone.updateMatrixWorld(true);
                var to_q = bone.getWorldQuaternion(null);
                markerMesh.quaternion.copy(to_q);
                _this.skeletonHelper.update();
            });
        };
        Model.prototype.modelData = function () {
            var joints = this.mesh.skeleton.bones.map(function (bone) {
                var q = bone.quaternion;
                return {
                    quaternion: [q.x, q.y, q.z, q.w]
                };
            });
            var p = this.mesh.position;
            var q = this.mesh.quaternion;
            return {
                name: this.name,
                position: [p.x, p.y, p.z],
                quaternion: [q.x, q.y, q.z, q.w],
                joints: joints
            };
        };
        Model.prototype.loadModelData = function (status) {
            var _this = this;
            if (!this.ready)
                return;
            var joints = status.joints;
            joints.forEach(function (joint, index) {
                var q = joint.quaternion;
                var target_q = _this.mesh.skeleton.bones[index].quaternion;
                target_q.set(q[0], q[1], q[2], q[3]);
            });
            var p = status.position;
            var q = status.quaternion;
            this.mesh.position.set(p[0], p[1], p[2]);
            this.mesh.quaternion.set(q[0], q[1], q[2], q[3]);
        };
        Model.prototype.initializePose = function (bone) {
            if (bone === void 0) { bone = null; }
            if (bone) {
                var q = bone.userData.initQuaternion;
                bone.quaternion.copy(q);
            }
            else {
                this.mesh.skeleton.bones.map(function (bone) {
                    var q = bone.userData.initQuaternion;
                    bone.quaternion.copy(q);
                });
            }
        };
        Model.prototype.toggleIKPropagation = function (bone_index) {
            var bone = this.mesh.skeleton.bones[bone_index];
            bone.userData.preventIKPropagation = !bone.userData.preventIKPropagation;
            var old_sprite = this.jointMarkerSprites[bone_index];
            var c = old_sprite.material.color.getHex();
            var sprite = this.createMarkerSprite(bone);
            sprite.material.color.setHex(c);
            sprite.scale.set(this.markerScale[0], this.markerScale[1], 1);
            this.jointMarkerSprites[bone_index] = sprite;
            this.scene2d.add(sprite);
            this.scene2d.remove(old_sprite);
        };
        Model.prototype.cancelMarkerSelection = function () {
            var _this = this;
            this.jointMarkerSprites.forEach(function (sprite) {
                if (sprite) {
                    sprite.material.color.setHex(_this.normalColor);
                }
            });
        };
        Model.prototype.selectMarker = function (index) {
            var sprite = this.jointMarkerSprites[index];
            if (sprite) {
                sprite.material.color.setHex(this.selectedColor);
            }
        };
        Model.prototype.hideMarker = function () {
            this.setMarkerVisibility(false);
        };
        Model.prototype.showMarker = function () {
            this.setMarkerVisibility(true);
        };
        Model.prototype.toggleMarker = function () {
            this.setMarkerVisibility(!this.showingMarker);
        };
        Model.prototype.setMarkerVisibility = function (showing) {
            this.jointMarkerSprites.forEach(function (marker) {
                marker.visible = showing;
            });
            this.skeletonHelper.visible = showing;
            this.showingMarker = showing;
        };
        Model.prototype.getMarkerVisibility = function () {
            return this.showingMarker;
        };
        Model.prototype.createMarkerSprite = function (bone) {
            if (bone.userData.preventIKPropagation) {
                return new THREE.Sprite(this.specialMarkerMat.clone());
            }
            else {
                return new THREE.Sprite(this.normalMarkerMat.clone());
            }
        };
        return Model;
    })();
    PoseEditor.Model = Model;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="screen.ts"/>
/// <reference path="configuration_dialog.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        var ControlPanel = (function () {
            function ControlPanel(screen) {
                var _this = this;
                this.toggleDom = {};
                this.doms = {};
                this.dialogs = {};
                this.screen = screen;
                this.panelDom = document.createElement("div");
                this.panelDom.className = 'control-panel';
                {
                    var s = this.panelDom.style;
                    s.position = 'absolute';
                    s.right = '0';
                    s.width = '100px';
                    s.height = this.screen.height + 'px';
                }
                this.screen.targetDom.appendChild(this.panelDom);
                this.toggleDom['camera'] = this.addButton(function (dom) {
                    dom.value = 'Camera';
                    dom.className = 'modes';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", Screen.Mode.Camera);
                    });
                });
                this.toggleDom['move'] = this.addButton(function (dom) {
                    dom.value = 'Move/Select';
                    dom.className = 'modes';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", Screen.Mode.Move);
                    });
                });
                this.toggleDom['bone'] = this.addButton(function (dom) {
                    dom.value = 'Bone';
                    dom.className = 'modes';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onmodeclick", Screen.Mode.Bone);
                    });
                });
                this.addHR();
                this.doms['undo'] = this.addButton(function (dom) {
                    dom.value = 'Undo';
                    dom.className = 'undo half';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onundo");
                    });
                    dom.disabled = true;
                });
                this.doms['redo'] = this.addButton(function (dom) {
                    dom.value = 'Redo';
                    dom.className = 'redo half';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onredo");
                    });
                    dom.disabled = true;
                });
                this.addClearDom();
                this.addHR();
                this.doms['initial_bone'] = this.addButton(function (dom) {
                    dom.value = 'Init Bone';
                    dom.className = 'init-bone half';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onboneinitialize");
                    });
                    dom.disabled = true;
                });
                this.doms['initial_pose'] = this.addButton(function (dom) {
                    dom.value = 'Init Pose';
                    dom.className = 'init-pose half';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("onposeinitialize");
                    });
                    dom.disabled = true;
                });
                this.addClearDom();
                this.addHR();
                this.dialogs['addmodel'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showaddmodel', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('onaddmodel', data);
                    });
                });
                this.doms['addmodel'] = this.addButton(function (dom) {
                    dom.value = 'AddModel';
                    dom.className = 'add-model';
                    dom.addEventListener("click", function () {
                        _this.dialogs['addmodel'].show();
                    });
                });
                this.doms['deletemodel'] = this.addButton(function (dom) {
                    dom.value = 'DeleteModel';
                    dom.className = 'remove-model';
                    dom.addEventListener("click", function () {
                        _this.screen.dispatchCallback("ondeletemodel");
                    });
                    dom.disabled = true;
                });
                this.addHR();
                this.dialogs['download'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showdownload', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('ondownload', data);
                    });
                });
                this.doms['download'] = this.addButton(function (dom) {
                    dom.value = 'Download';
                    dom.className = 'saving';
                    dom.addEventListener("click", function () {
                        _this.dialogs['download'].show();
                    });
                });
                this.doms['restore'] = this.addButton(function (dom) {
                    dom.value = 'Restore';
                    dom.className = 'saving';
                    var fileInput = document.createElement("input");
                    fileInput.type = 'file';
                    fileInput.style.display = 'none';
                    fileInput.onchange = function (e) {
                        var files = fileInput.files;
                        if (files.length != 1) {
                            return false;
                        }
                        var file = files[0];
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var data = reader.result;
                            _this.screen.dispatchCallback('onrestore', data);
                        };
                        reader.readAsText(file);
                    };
                    dom.appendChild(fileInput);
                    dom.addEventListener("click", function () { return fileInput.click(); });
                });
                this.addHR();
                this.dialogs['config'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        _this.screen.dispatchCallback('showconfig', function (data) {
                            c.setValues(data);
                        });
                    });
                    c.addCallback('onsubmit', function (data) {
                        _this.screen.dispatchCallback('onconfig', data);
                    });
                });
                this.doms['config'] = this.addButton(function (dom) {
                    dom.value = 'Config';
                    dom.className = 'config';
                    dom.addEventListener("click", function () {
                        _this.dialogs['config'].show();
                    });
                });
                this.dialogs['error'] = this.addDialog(function (c) {
                    c.addCallback('show', function () {
                        c.setValues([{
                                type: 'message',
                                text: 'エラーが発生しました．'
                            }]);
                    });
                    c.addCallback('onsubmit', function (data) {
                    });
                }, false);
            }
            ControlPanel.prototype.addButton = function (callback) {
                var dom = document.createElement("input");
                dom.type = "button";
                callback(dom);
                this.panelDom.appendChild(dom);
                return dom;
            };
            ControlPanel.prototype.addDialog = function (callback, hasCancel) {
                if (hasCancel === void 0) { hasCancel = true; }
                var ctrl = new Screen.ConfigurationDialog(this.screen.targetDom, hasCancel);
                callback(ctrl);
                return ctrl;
            };
            ControlPanel.prototype.getDialog = function (name) {
                return this.dialogs[name];
            };
            ControlPanel.prototype.addClearDom = function () {
                var dom = document.createElement("div");
                dom.style.clear = 'both';
                this.panelDom.appendChild(dom);
            };
            ControlPanel.prototype.addHR = function () {
                var dom = document.createElement("hr");
                this.panelDom.appendChild(dom);
            };
            ControlPanel.prototype.selectModeUI = function (mode) {
                for (var key in this.toggleDom) {
                    this.toggleDom[key].disabled = false;
                }
                this.toggleDom[mode].disabled = true;
            };
            ControlPanel.prototype.changeUIStatus = function (name, callback) {
                var dom = this.doms[name];
                if (dom == null)
                    return false;
                return callback(dom);
            };
            ControlPanel.prototype.onResize = function (width, height) {
            };
            return ControlPanel;
        })();
        Screen.ControlPanel = ControlPanel;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="event_dispatcher.ts"/>
/// <reference path="control_panel.ts"/>
/// <reference path="loading_dialog.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Screen;
    (function (Screen) {
        (function (Mode) {
            Mode[Mode["Camera"] = 0] = "Camera";
            Mode[Mode["Move"] = 1] = "Move";
            Mode[Mode["Bone"] = 2] = "Bone";
        })(Screen.Mode || (Screen.Mode = {}));
        var Mode = Screen.Mode;
        var ScreenController = (function (_super) {
            __extends(ScreenController, _super);
            function ScreenController(parentDomId, config) {
                var _this = this;
                _super.call(this);
                this.loadingDom = null;
                var parentDom = document.getElementById(parentDomId);
                if (parentDom == null) {
                    console.log("parent dom was not found...");
                }
                this.targetDom = parentDom ? parentDom : document.body;
                this.width = this.targetDom.offsetWidth;
                this.height = this.targetDom.offsetHeight;
                this.aspect = this.width / this.height;
                if (config.loadingImagePath) {
                    this.loadingDom = new Screen.LoadingDialog(this.targetDom, config.loadingImagePath);
                    this.showLoadingDom();
                }
                this.controlPanel = new Screen.ControlPanel(this);
                window.addEventListener('resize', function () { return _this.onResize(); }, false);
            }
            ScreenController.prototype.selectModeUI = function (mode) {
                this.controlPanel.selectModeUI(mode);
            };
            ScreenController.prototype.changeUIStatus = function (name, callback) {
                return this.controlPanel.changeUIStatus(name, callback);
            };
            ScreenController.prototype.appendChild = function (dom) {
                this.targetDom.appendChild(dom);
            };
            ScreenController.prototype.onResize = function () {
                var w = this.targetDom.offsetWidth;
                var h = this.targetDom.offsetHeight;
                if (this.width == w && this.height == h) {
                    return false;
                }
                this.width = w;
                this.height = h;
                this.aspect = this.width / this.height;
                this.dispatchCallback('resize');
                this.controlPanel.onResize(this.width, this.height);
                return false;
            };
            ScreenController.prototype.showLoadingDom = function () {
                if (this.loadingDom) {
                    this.loadingDom.show();
                }
            };
            ScreenController.prototype.hideLoadingDom = function () {
                if (this.loadingDom) {
                    this.loadingDom.hide();
                }
            };
            ScreenController.prototype.getDialog = function (name) {
                return this.controlPanel.getDialog(name);
            };
            return ScreenController;
        })(PoseEditor.EventDispatcher);
        Screen.ScreenController = ScreenController;
    })(Screen = PoseEditor.Screen || (PoseEditor.Screen = {}));
})(PoseEditor || (PoseEditor = {}));
var PoseEditor;
(function (PoseEditor) {
    var TimeMachine;
    (function (TimeMachine) {
        var Action = (function () {
            function Action() {
            }
            Action.prototype.undo = function () { };
            Action.prototype.redo = function () { };
            Action.prototype.dispose = function () { };
            return Action;
        })();
        TimeMachine.Action = Action;
        var ChangeModelStatusAction = (function (_super) {
            __extends(ChangeModelStatusAction, _super);
            function ChangeModelStatusAction(m, b, a) {
                _super.call(this);
                this.model = m;
                this.beforeStatus = b;
                this.afterStatus = a;
            }
            ChangeModelStatusAction.prototype.undo = function () {
                this.model.loadModelData(this.beforeStatus);
            };
            ChangeModelStatusAction.prototype.redo = function () {
                this.model.loadModelData(this.afterStatus);
            };
            return ChangeModelStatusAction;
        })(Action);
        TimeMachine.ChangeModelStatusAction = ChangeModelStatusAction;
        var ChangeModelRemoveAction = (function (_super) {
            __extends(ChangeModelRemoveAction, _super);
            function ChangeModelRemoveAction(m, b, real) {
                _super.call(this);
                this.model = m;
                this.refModels = real;
                this.beforeModels = b;
                this.afterModels = real.concat();
            }
            ChangeModelRemoveAction.prototype.undo = function () {
                var _this = this;
                this.refModels.splice(0, this.refModels.length);
                this.beforeModels.forEach(function (e) { return _this.refModels.push(e); });
                this.model.reactivate();
            };
            ChangeModelRemoveAction.prototype.redo = function () {
                var _this = this;
                this.refModels.splice(0, this.refModels.length);
                this.afterModels.forEach(function (e) { return _this.refModels.push(e); });
                this.model.deactivate();
            };
            ChangeModelRemoveAction.prototype.dispose = function () {
                if (!this.model.isReady) {
                    this.model.dispose();
                }
            };
            return ChangeModelRemoveAction;
        })(Action);
        TimeMachine.ChangeModelRemoveAction = ChangeModelRemoveAction;
        var ChangeModelAppendAction = (function (_super) {
            __extends(ChangeModelAppendAction, _super);
            function ChangeModelAppendAction(m, b, real) {
                _super.call(this);
                this.model = m;
                this.refModels = real;
                this.beforeModels = b;
                this.afterModels = real.concat();
            }
            ChangeModelAppendAction.prototype.undo = function () {
                var _this = this;
                this.refModels.splice(0, this.refModels.length);
                this.beforeModels.forEach(function (e) { return _this.refModels.push(e); });
                this.model.deactivate();
            };
            ChangeModelAppendAction.prototype.redo = function () {
                var _this = this;
                this.refModels.splice(0, this.refModels.length);
                this.afterModels.forEach(function (e) { return _this.refModels.push(e); });
                this.model.reactivate();
            };
            return ChangeModelAppendAction;
        })(Action);
        TimeMachine.ChangeModelAppendAction = ChangeModelAppendAction;
    })(TimeMachine = PoseEditor.TimeMachine || (PoseEditor.TimeMachine = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="time_machine_action.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var TimeMachine;
    (function (TimeMachine) {
        var Machine = (function () {
            function Machine(screen) {
                this.history = [];
                this.currentStep = -1;
                this.side = 1;
                this.reachedBottom = true;
                this.reachedTop = true;
                this.screen = screen;
            }
            Machine.prototype.undo = function () {
                if (this.currentStep < 0 || this.history.length == 0)
                    return;
                this.history[this.currentStep].undo();
                this.currentStep--;
                this.side = 0;
                this.clamp();
                this.updateUI();
            };
            Machine.prototype.redo = function () {
                if (this.currentStep >= this.history.length)
                    return;
                this.history[this.currentStep].redo();
                this.currentStep++;
                this.side = 1;
                this.clamp();
                this.updateUI();
            };
            Machine.prototype.didAction = function (act) {
                if (!this.reachedTop) {
                    if (this.side == 0) {
                        var a = this.currentStep == 0 ? 0 : 1;
                        var deleteFrom = this.currentStep + a;
                        var dels = this.history.splice(deleteFrom, this.history.length - deleteFrom);
                        this.currentStep++;
                        dels.forEach(function (d) { return d.dispose(); });
                    }
                    else {
                        var deleteFrom = this.currentStep;
                        var dels = this.history.splice(deleteFrom, this.history.length - deleteFrom);
                        dels.forEach(function (d) { return d.dispose(); });
                    }
                }
                else {
                    this.currentStep++;
                }
                this.history.push(act);
                this.clamp();
                this.reachedBottom = false;
                this.reachedTop = true;
                this.side = 1;
                this.updateUI();
            };
            Machine.prototype.updateUI = function () {
                var _this = this;
                if (this.screen) {
                    this.screen.changeUIStatus('undo', function (dom) {
                        dom.disabled = _this.reachedBottom;
                    });
                    this.screen.changeUIStatus('redo', function (dom) {
                        dom.disabled = _this.reachedTop;
                    });
                }
            };
            Machine.prototype.clamp = function () {
                this.reachedBottom = false;
                this.reachedTop = false;
                if (this.currentStep < 0) {
                    this.currentStep = 0;
                    this.reachedBottom = true;
                }
                else if (this.currentStep >= this.history.length) {
                    this.currentStep = this.history.length - 1;
                    this.reachedTop = true;
                }
            };
            return Machine;
        })();
        TimeMachine.Machine = Machine;
    })(TimeMachine = PoseEditor.TimeMachine || (PoseEditor.TimeMachine = {}));
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../typings/threejs/three-orbitcontrols.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="screen.ts"/>
/// <reference path="model.ts"/>
/// <reference path="cursor_position_helper.ts"/>
/// <reference path="time_machine.ts"/>
/// <reference path="action_controller.ts"/>
/// <reference path="etc.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var Editor = (function () {
        function Editor(parentDomId, modelInfoTable, spritePaths, defaultCamera, config) {
            var _this = this;
            if (defaultCamera === void 0) { defaultCamera = new PoseEditor.CameraConfig(); }
            if (config === void 0) { config = new PoseEditor.Config(); }
            this.config = config;
            this.renderLoop = function () {
                requestAnimationFrame(_this.renderLoop);
                _this.update();
                _this.render();
            };
            this.models = [];
            this.modelsIdIndexer = [];
            this.modelIdNum = 0;
            this.logoRenderer = null;
            this.loadingTasks = 0;
            this.currentValues = {};
            this.screen = new PoseEditor.Screen.ScreenController(parentDomId, config);
            this.screen.targetDom.className = config.theme;
            this.actionController = new PoseEditor.ActionController();
            this.history = new PoseEditor.TimeMachine.Machine(this.screen);
            this.screen.addCallback('resize', function () { return _this.onResize(); });
            this.screen.addCallback('onmodeclick', function (m) {
                _this.actionController.onModeSelect(m, _this.screen);
            });
            this.screen.addCallback('onundo', function () { return _this.history.undo(); });
            this.screen.addCallback('onredo', function () { return _this.history.redo(); });
            this.screen.addCallback('onboneinitialize', function () { return _this.initializeCurrentBone(); });
            this.screen.addCallback('onposeinitialize', function () { return _this.initializeCurrentPose(); });
            this.screen.addCallback('showdownload', function (f) {
                _this.setDownloadTypes(f);
            });
            this.screen.addCallback('ondownload', function (data) {
                _this.onDownload(data);
            });
            this.screen.addCallback('showaddmodel', function (f) {
                _this.setAddModelTypes(f);
            });
            this.screen.addCallback('onaddmodel', function (data) {
                _this.onAddModel(data);
            });
            this.screen.addCallback('ondeletemodel', function (data) {
                _this.onDeleteModel();
            });
            this.screen.addCallback('showconfig', function (f) {
                _this.setConfigTypes(f);
            });
            this.screen.addCallback('onconfig', function (data) {
                _this.onConfig(data);
            });
            this.screen.addCallback('onrestore', function (data) {
                _this.onRestore(data);
            });
            this.actionController.onModeSelect(PoseEditor.Screen.Mode.Camera, this.screen);
            this.modelInfoTable = modelInfoTable;
            this.spritePaths = spritePaths;
            this.fov = 60;
            this.near = 1;
            this.far = 1000;
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.fov, this.screen.aspect, this.near, this.far);
            this.camera.position.copy(defaultCamera.position);
            (function () {
                var light = new THREE.DirectionalLight(0xffffff);
                light.position.set(0, 0.7, 0.7);
                _this.scene.add(light);
            })();
            (function () {
                var light = new THREE.DirectionalLight(0xffffff);
                light.position.set(0, 0.7, -0.7);
                _this.scene.add(light);
            })();
            (function () {
                var light = new THREE.AmbientLight(0xffffff);
                _this.scene.add(light);
            })();
            this.scene2d = new THREE.Scene();
            var propForRenderer = {
                preserveDrawingBuffer: true
            };
            propForRenderer.alpha = config.enableBackgroundAlpha;
            this.renderer = new THREE.WebGLRenderer(propForRenderer);
            this.renderer.setSize(this.screen.width, this.screen.height);
            this.renderer.autoClear = false;
            this.renderer.setClearColor(config.backgroundColorHex, config.backgroundAlpha);
            this.screen.appendChild(this.renderer.domElement);
            this.gridHelper = new THREE.GridHelper(50.0, 5.0);
            this.scene.add(this.gridHelper);
            if (config.isDebugging) {
                this.axisHelper = new THREE.AxisHelper(50.0);
                this.scene.add(this.axisHelper);
            }
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(defaultCamera.lookAt);
            this.controls.update();
            this.controls.enabled = false;
            this.controls.addEventListener('change', function () {
                _this.transformCtrl.update();
            });
            this.transformCtrl
                = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.scene.add(this.transformCtrl);
            this.cursorHelper = new PoseEditor.CursorPositionHelper(this.scene, this.camera, this.controls);
            this.currentValues['bgColorHex'] = config.backgroundColorHex;
            this.currentValues['bgAlpha'] = config.backgroundAlpha;
            this.currentValues['format'] = 'png';
            this.actionController.setup(this, this.transformCtrl, this.controls, this.renderer.domElement);
            this.sceneForPicking = new THREE.Scene();
            this.textureForPicking = new THREE.WebGLRenderTarget(this.screen.width, this.screen.height, {
                minFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            });
            if (config.logoConfig) {
                this.logoRenderer = new PoseEditor.LogoRenderer(this.screen, config.logoConfig);
            }
            this.renderLoop();
        }
        Editor.prototype.selectModel = function (e, isTouch) {
            e.preventDefault();
            this.sceneForPicking.updateMatrixWorld(true);
            var c = this.renderer.getClearColor().clone();
            this.renderer.setClearColor(0xffffff);
            this.renderer.render(this.sceneForPicking, this.camera, this.textureForPicking, true);
            this.renderer.setClearColor(c);
            var clientCur = this.getCursor(e, isTouch);
            var clientX = clientCur[0];
            var clientY = clientCur[1];
            var pixelBuffer = new Uint8Array(4);
            this.renderer.readRenderTargetPixels(this.textureForPicking, clientX, this.textureForPicking.height - clientY, 1.0, 1.0, pixelBuffer);
            var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
            if (id == 0xffffff)
                return null;
            var model = this.modelsIdIndexer[id];
            if (!model.isReady())
                return null;
            model.mesh.updateMatrixWorld();
            var vector = new THREE.Vector3();
            vector.setFromMatrixPosition(model.mesh.matrixWorld);
            this.cursorHelper.setBeginState(vector);
            var pos = this.cursorHelper.move(this.cursorToWorld(e, isTouch));
            if (!pos)
                return null;
            return [model, pos];
        };
        Editor.prototype.selectJointMarker = function (e, isTouch) {
            var _this = this;
            e.preventDefault();
            var pos = this.cursorToWorld(e, isTouch);
            var l = 9999999999.9;
            var selectedMarker = null;
            var ab = pos.clone().sub(this.camera.position).normalize();
            var flattened = this.models.map(function (v) {
                return v.jointMarkerMeshes;
            }).reduce(function (a, b) {
                return a.concat(b);
            });
            flattened.forEach(function (s) {
                var ap = s.position.clone().sub(_this.camera.position);
                var len = ap.length();
                var diff_c = len * len / 200.0;
                var margin = Math.max(0.001, Math.min(1.4, diff_c));
                var d = ab.clone().cross(ap).length();
                var h = d;
                if (h < margin) {
                    if (h < l) {
                        l = h;
                        selectedMarker = s;
                    }
                }
            });
            return selectedMarker;
        };
        Editor.prototype.setSelectedModel = function (m) {
            var _this = this;
            if (this.selectedModel) {
                this.selectedModel.selectionState(false);
            }
            this.selectedModel = m;
            if (this.selectedModel) {
                this.selectedModel.selectionState(true);
            }
            this.screen.changeUIStatus('deletemodel', function (dom) {
                dom.disabled = _this.selectedModel == null;
            });
            this.screen.changeUIStatus('initial_pose', function (dom) {
                dom.disabled = _this.selectedModel == null;
            });
        };
        Editor.prototype.setSelectedBoneAndModel = function (bone, model) {
            var _this = this;
            if (bone == null || model == null) {
                this.selectedBoneAndModel = null;
            }
            else {
                this.selectedBoneAndModel = [bone, model];
            }
            this.screen.changeUIStatus('initial_bone', function (dom) {
                dom.disabled = _this.selectedBoneAndModel == null;
            });
        };
        Editor.prototype.cancelAllMarkerSprite = function () {
            this.models.forEach(function (model) {
                model.cancelMarkerSelection();
            });
        };
        Editor.prototype.selectMarkerSprite = function (markerMesh) {
            this.cancelAllMarkerSprite();
            var model = markerMesh.userData.ownerModel;
            var index = markerMesh.userData.jointIndex;
            model.selectMarker(index);
        };
        Editor.prototype.hideAllMarkerSprite = function () {
            this.models.forEach(function (model) {
                model.hideMarker();
            });
        };
        Editor.prototype.showAllMarkerSprite = function () {
            this.models.forEach(function (model) {
                model.showMarker();
            });
        };
        Editor.prototype.onResize = function () {
            this.renderer.setSize(this.screen.width, this.screen.height);
            this.textureForPicking.setSize(this.screen.width, this.screen.height);
            this.camera.aspect = this.screen.aspect;
            this.camera.updateProjectionMatrix();
            if (this.logoRenderer) {
                this.logoRenderer.onResize();
            }
        };
        Editor.prototype.loadAndAppendModel = function (name, modelInfo, spritePaths, callback) {
            var _this = this;
            this.modelsIdIndexer.forEach(function (m, index) {
                if (m.isDisposed()) {
                    _this.modelsIdIndexer[index] = null;
                    --_this.modelIdNum;
                }
            });
            if (this.modelIdNum > 255) {
                if (callback) {
                    callback(null, "poseeditor cannot have a number of models over 255.");
                }
                return;
            }
            var modelId = this.modelsIdIndexer.indexOf(null);
            if (modelId == -1) {
                modelId = this.modelsIdIndexer.length;
                this.modelsIdIndexer.push(null);
            }
            this.incTask();
            var model = new PoseEditor.Model(name, modelInfo, spritePaths, this.scene, this.scene2d, modelId, this.sceneForPicking, function (m, e) {
                _this.decTask();
                var nx = modelInfo.ikInversePropagationJoints;
                nx.forEach(function (jointIndex) {
                    model.toggleIKPropagation(jointIndex);
                });
                if (callback) {
                    callback(m, e);
                }
            });
            var beforeModelsArray = this.models.concat();
            this.models.push(model);
            this.modelsIdIndexer[modelId] = model;
            ++this.modelIdNum;
            this.history.didAction(new PoseEditor.TimeMachine.ChangeModelAppendAction(model, beforeModelsArray, this.models));
        };
        Editor.prototype.resetCtrl = function () {
            this.transformCtrl.detach();
        };
        Editor.prototype.update = function () {
            var _this = this;
            this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);
            this.models.forEach(function (model) {
                if (model.isReady()) {
                    model.update();
                    _this.actionController.execActions(function (act) { return act.update(model); });
                }
            });
        };
        Editor.prototype.render = function () {
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.renderer.clearDepth();
            this.renderer.render(this.scene2d, this.camera);
            if (this.logoRenderer) {
                this.logoRenderer.render(this.renderer);
            }
        };
        Editor.prototype.screenToWorld = function (screen_pos) {
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;
            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            world_pos.unproject(this.camera);
            return world_pos;
        };
        Editor.prototype.worldToScreen = function (world_pos) {
            var window_half_x = this.screen.width / 2.0;
            var window_half_y = this.screen.height / 2.0;
            var screen_pos = world_pos.clone();
            screen_pos.project(this.camera);
            screen_pos.x = (screen_pos.x + 1) * window_half_x;
            screen_pos.y = (-screen_pos.y + 1) * window_half_y;
            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        };
        Editor.prototype.cursorToWorld = function (e, isTouch) {
            var cur = this.getCursor(e, isTouch);
            var mouseX = cur[0];
            var mouseY = cur[1];
            return this.screenToWorld(new THREE.Vector2(mouseX, mouseY));
        };
        Editor.prototype.getCursor = function (e, isTouch) {
            var clientX = isTouch ? e.changedTouches[0].pageX : e.clientX;
            var clientY = isTouch ? e.changedTouches[0].pageY : e.clientY;
            var domPos = this.renderer.domElement.getBoundingClientRect();
            var mouseX = clientX - domPos.left;
            var mouseY = clientY - domPos.top;
            return [
                mouseX,
                mouseY
            ];
        };
        Editor.prototype.setDownloadTypes = function (f) {
            var order = [
                {
                    type: 'radio',
                    name: 'format',
                    value: ['png', 'jpeg', 'json'],
                    label: ['PNG', 'JPEG', 'SceneData'],
                    selectedValue: this.currentValues['format']
                }
            ];
            f(order);
        };
        Editor.prototype.onDownload = function (data) {
            var type = data['format'];
            if (type == null)
                return;
            this.currentValues['format'] = type;
            this.download(type);
        };
        Editor.prototype.toDataUrl = function (type) {
            if (type === void 0) { type = 'png'; }
            switch (type) {
                case "png":
                    return this.makeDataUrl("image/png");
                case "jpeg":
                    return this.makeDataUrl("image/jpeg");
                case "json":
                    return "data: text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.getSceneInfo()));
                default:
                    throw new Error("File format '" + type + "' is not supported");
            }
        };
        Editor.prototype.download = function (type) {
            if (type === void 0) { type = 'png'; }
            var dataUrl = this.toDataUrl(type);
            var a = document.createElement("a");
            a.download = "poseeditor." + type;
            a.title = "download snapshot";
            a.href = dataUrl;
            a.click();
        };
        Editor.prototype.setAddModelTypes = function (f) {
            var value = [];
            var label = [];
            for (var key in this.modelInfoTable) {
                value.push(key);
                label.push(key);
            }
            var order = [
                {
                    type: 'select',
                    name: 'modelName',
                    value: value,
                    label: label,
                    selectedValue: this.currentValues['modelName']
                }
            ];
            f(order);
        };
        Editor.prototype.onAddModel = function (data) {
            var name = data['modelName'];
            if (name == null)
                return;
            this.currentValues['modelName'] = name;
            this.appendModel(name, function (model, error) {
                if (error) {
                    console.log("error: ", error);
                }
            });
        };
        Editor.prototype.onDeleteModel = function () {
            if (this.selectedModel) {
                this.removeModel(this.selectedModel);
            }
        };
        Editor.prototype.setConfigTypes = function (f) {
            var order = [
                {
                    type: 'input',
                    name: 'bgColorHex',
                    value: '0x' + this.currentValues['bgColorHex'].toString(16),
                    label: '背景色'
                },
                {
                    type: 'input',
                    name: 'bgAlpha',
                    value: this.currentValues['bgAlpha'].toFixed(6),
                    label: '背景アルファ'
                }
            ];
            f(order);
        };
        Editor.prototype.onConfig = function (data) {
            var bgColorHex = data['bgColorHex'];
            if (bgColorHex) {
                this.currentValues['bgColorHex'] = parseInt(bgColorHex, 16);
            }
            var bgAlpha = data['bgAlpha'];
            if (bgAlpha) {
                this.currentValues['bgAlpha'] = parseFloat(bgAlpha);
            }
            this.setClearColor(this.currentValues['bgColorHex'], this.currentValues['bgAlpha']);
        };
        Editor.prototype.onRestore = function (data) {
            var jsonString = data;
            if (jsonString == null)
                return;
            try {
                this.loadSceneDataFromString(jsonString);
            }
            catch (e) {
                this.screen.getDialog('error').show();
                console.error(e);
            }
        };
        Editor.prototype.getSceneInfo = function () {
            return {
                'camera': {
                    'position': this.camera.position,
                    'target': this.controls.target
                },
                'models': {
                    'num': this.models.length,
                    'list': this.models.map(function (m) { return m.modelData(); })
                },
                'version': '0.0.1'
            };
        };
        Editor.prototype.loadSceneDataFromString = function (data) {
            var obj = JSON.parse(data);
            var camera = obj.camera;
            this.camera.position.copy(camera.position);
            this.controls.target.copy(camera.target);
            this.controls.update();
            this.removeAllModel();
            var models = obj.models;
            for (var i = 0; i < models.num; i++) {
                var l = models.list[i];
                var name = l.name;
                this.appendModel(name, (function (i, ll) {
                    return function (m, error) {
                        if (error) {
                            console.log("Error occured: index[" + i + "], name[" + name + "]");
                        }
                        else {
                            m.loadModelData(ll);
                        }
                    };
                })(i, l));
            }
        };
        Editor.prototype.setClearColor = function (color_hex, alpha) {
            this.renderer.setClearColor(color_hex, alpha);
        };
        Editor.prototype.hideMarker = function () {
            this.models.forEach(function (model) {
                model.hideMarker();
            });
        };
        Editor.prototype.showMarker = function () {
            this.models.forEach(function (model) {
                model.showMarker();
            });
        };
        Editor.prototype.toggleMarker = function () {
            this.models.forEach(function (model) {
                model.toggleMarker();
            });
        };
        Editor.prototype.initializeCurrentBone = function () {
            if (this.selectedBoneAndModel) {
                var beforeModelStatus = this.selectedBoneAndModel[1].modelData();
                this.selectedBoneAndModel[1].initializePose(this.selectedBoneAndModel[0]);
                var currentModelStatus = this.selectedBoneAndModel[1].modelData();
                if (!PoseEditor.isEqualModelStatus(beforeModelStatus, currentModelStatus)) {
                    this.history.didAction(new PoseEditor.TimeMachine.ChangeModelStatusAction(this.selectedBoneAndModel[1], beforeModelStatus, currentModelStatus));
                }
            }
        };
        Editor.prototype.initializeCurrentPose = function () {
            if (this.selectedModel) {
                var beforeModelStatus = this.selectedModel.modelData();
                this.selectedModel.initializePose();
                var currentModelStatus = this.selectedModel.modelData();
                if (!PoseEditor.isEqualModelStatus(beforeModelStatus, currentModelStatus)) {
                    this.history.didAction(new PoseEditor.TimeMachine.ChangeModelStatusAction(this.selectedModel, beforeModelStatus, currentModelStatus));
                }
            }
        };
        Editor.prototype.appendModel = function (name, callback) {
            if (callback === void 0) { callback = null; }
            if (name in this.modelInfoTable) {
                this.loadAndAppendModel(name, this.modelInfoTable[name], this.spritePaths, callback);
            }
            else {
                var errMsg = "model name[" + name + "] is not found";
                if (callback) {
                    callback(null, errMsg);
                }
                else {
                    console.error(errMsg);
                }
            }
        };
        Editor.prototype.removeAllModel = function () {
            this.models.forEach(function (m) {
                m.deactivate();
            });
            this.models = [];
            this.resetCtrl();
        };
        Editor.prototype.removeModelByIndex = function (index) {
            var model = this.models[index];
            model.deactivate();
            var beforeModelsArray = this.models.concat();
            this.models.splice(index, 1);
            this.resetCtrl();
            this.setSelectedModel(null);
            this.setSelectedBoneAndModel(null, null);
            this.history.didAction(new PoseEditor.TimeMachine.ChangeModelRemoveAction(model, beforeModelsArray, this.models));
        };
        Editor.prototype.removeModel = function (model) {
            var index = this.models.indexOf(model);
            if (index != -1) {
                this.removeModelByIndex(index);
            }
        };
        Editor.prototype.makeDataUrl = function (type) {
            var markerVis = this.models.map(function (m) { return m.getMarkerVisibility(); });
            this.models.forEach(function (m) { return m.setMarkerVisibility(false); });
            var transVis = this.transformCtrl.visible;
            this.transformCtrl.visible = false;
            var dom = this.renderer.domElement;
            var w = dom.width;
            var h = dom.height;
            try {
                this.renderer.setSize(w * 2, h * 2);
                this.render();
                var data = dom.toDataURL(type);
                return data;
            }
            catch (e) {
                throw e;
            }
            finally {
                dom.width = w;
                dom.height = h;
                this.renderer.setSize(w, h);
                this.transformCtrl.visible = transVis;
                this.models.forEach(function (m, i) {
                    m.setMarkerVisibility(markerVis[i]);
                });
            }
        };
        Editor.prototype.incTask = function () {
            if (this.loadingTasks == 0) {
                this.screen.showLoadingDom();
            }
            this.loadingTasks++;
        };
        Editor.prototype.decTask = function () {
            this.loadingTasks--;
            if (this.loadingTasks == 0) {
                this.screen.hideLoadingDom();
            }
        };
        return Editor;
    })();
    PoseEditor.Editor = Editor;
})(PoseEditor || (PoseEditor = {}));
/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="etc.ts"/>
var PoseEditor;
(function (PoseEditor) {
    var LogoRenderer = (function () {
        function LogoRenderer(screen, logoConfig) {
            this.screen = screen;
            this.logoConfig = logoConfig;
            this.visible = true;
            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-screen.width / 2, screen.width / 2, screen.height / 2, -screen.height / 2, 1, 100);
            this.camera.position.set(0, 0, 10);
            var texture = THREE.ImageUtils.loadTexture(logoConfig.path);
            var material = new THREE.SpriteMaterial({
                map: texture,
                color: 0xffffff
            });
            this.sprite = new THREE.Sprite(material);
            this.setSpriteSize();
            this.setSpritePosition();
            this.scene.add(this.sprite);
        }
        LogoRenderer.prototype.setSpriteSize = function () {
            var _this = this;
            this.width = (function () {
                if (typeof _this.logoConfig.width === 'string') {
                    return _this.toPercent(_this.logoConfig.width) * _this.screen.width;
                }
                else if (typeof _this.logoConfig.width === 'number') {
                    return _this.logoConfig.width;
                }
                else {
                    console.error("");
                    return null;
                }
            })();
            this.widthRatio = this.logoConfig.rawWidth / this.screen.width;
            this.width *= this.widthRatio;
            this.height = (function () {
                if (typeof _this.logoConfig.height === 'string') {
                    return _this.toPercent(_this.logoConfig.height) * _this.screen.height;
                }
                else if (typeof _this.logoConfig.height === 'number') {
                    return _this.logoConfig.height;
                }
                else {
                    console.error("");
                    return null;
                }
            })();
            this.heightRatio = this.logoConfig.rawHeight / this.screen.height;
            this.height *= this.heightRatio;
            this.offsetX = (this.screen.width - this.width) / 2.0;
            this.offsetY = (this.screen.height - this.height) / 2.0;
            this.sprite.scale.set(this.width, this.height, 1);
        };
        LogoRenderer.prototype.setSpritePosition = function () {
            switch (this.logoConfig.position) {
                case PoseEditor.LogoPosition.LeftBottom:
                    var lpos = this.getLeftPosition(this.logoConfig.left);
                    var bpos = this.getBottomPosition(this.logoConfig.bottom);
                    this.sprite.position.set(lpos, bpos, 1);
                    break;
                default:
                    break;
            }
        };
        LogoRenderer.prototype.getLeftPosition = function (s) {
            if (typeof s === 'string') {
                return (this.toPercent(s) * this.width) - this.offsetX;
            }
            else if (typeof s === 'number') {
                return s - this.offsetX;
            }
            else {
                console.error("");
                return null;
            }
        };
        LogoRenderer.prototype.getBottomPosition = function (s) {
            if (typeof s === 'string') {
                return (this.toPercent(s) * this.height) - this.offsetY;
            }
            else if (typeof s === 'number') {
                return s - this.offsetY;
            }
            else {
                console.error("");
                return null;
            }
        };
        LogoRenderer.prototype.toPercent = function (s) {
            return parseFloat(s) / 100.0;
        };
        LogoRenderer.prototype.onResize = function () {
            this.camera.left = -this.screen.width / 2;
            this.camera.right = this.screen.width / 2;
            this.camera.top = this.screen.height / 2;
            this.camera.bottom = -this.screen.height / 2;
            this.camera.updateProjectionMatrix();
            this.setSpriteSize();
            this.setSpritePosition();
        };
        LogoRenderer.prototype.render = function (renderer) {
            if (this.visible) {
                renderer.render(this.scene, this.camera);
            }
        };
        return LogoRenderer;
    })();
    PoseEditor.LogoRenderer = LogoRenderer;
})(PoseEditor || (PoseEditor = {}));
//# sourceMappingURL=poseeditor.unit.js.map