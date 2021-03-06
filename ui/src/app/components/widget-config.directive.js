/*
 * Copyright © 2016-2017 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import jsonSchemaDefaults from 'json-schema-defaults';
import thingsboardTypes from '../common/types.constant';
import thingsboardUtils from '../common/utils.service';
import thingsboardDeviceAliasSelect from './device-alias-select.directive';
import thingsboardDatasource from './datasource.directive';
import thingsboardTimewindow from './timewindow.directive';
import thingsboardJsonForm from "./json-form.directive";

/* eslint-disable import/no-unresolved, import/default */

import widgetConfigTemplate from './widget-config.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

/* eslint-disable angular/angularelement */

export default angular.module('thingsboard.directives.widgetConfig', [thingsboardTypes,
    thingsboardUtils,
    thingsboardJsonForm,
    thingsboardDeviceAliasSelect,
    thingsboardDatasource,
    thingsboardTimewindow])
    .directive('tbWidgetConfig', WidgetConfig)
    .name;

/*@ngInject*/
function WidgetConfig($compile, $templateCache, $rootScope, types, utils) {

    var linker = function (scope, element, attrs, ngModelCtrl) {

        var template = $templateCache.get(widgetConfigTemplate);

        element.html(template);

        scope.types = types;
        scope.widgetEditMode = $rootScope.widgetEditMode;

        scope.emptySettingsSchema = {
            type: "object",
            properties: {}
        };
        scope.defaultSettingsForm = [
            '*'
        ];

        if (angular.isUndefined(scope.forceExpandDatasources)) {
            scope.forceExpandDatasources = false;
        }

        scope.currentSettingsSchema = {};
        scope.currentSettings = angular.copy(scope.emptySettingsSchema);

        scope.targetDeviceAlias = {
            value: null
        }

        ngModelCtrl.$render = function () {
            if (ngModelCtrl.$viewValue) {
                scope.selectedTab = 0;
                scope.title = ngModelCtrl.$viewValue.title;
                scope.showTitle = ngModelCtrl.$viewValue.showTitle;
                scope.backgroundColor = ngModelCtrl.$viewValue.backgroundColor;
                scope.color = ngModelCtrl.$viewValue.color;
                scope.padding = ngModelCtrl.$viewValue.padding;
                scope.timewindow = ngModelCtrl.$viewValue.timewindow;
                if (scope.widgetType !== types.widgetType.rpc.value) {
                    if (scope.datasources) {
                        scope.datasources.splice(0, scope.datasources.length);
                    } else {
                        scope.datasources = [];
                    }
                    if (ngModelCtrl.$viewValue.datasources) {
                        for (var i in ngModelCtrl.$viewValue.datasources) {
                            scope.datasources.push({value: ngModelCtrl.$viewValue.datasources[i]});
                        }
                    }
                } else {
                    if (ngModelCtrl.$viewValue.targetDeviceAliasIds && ngModelCtrl.$viewValue.targetDeviceAliasIds.length > 0) {
                        var aliasId = ngModelCtrl.$viewValue.targetDeviceAliasIds[0];
                        if (scope.deviceAliases[aliasId]) {
                            scope.targetDeviceAlias.value = {id: aliasId, alias: scope.deviceAliases[aliasId].alias,
                                deviceId: scope.deviceAliases[aliasId].deviceId};
                        } else {
                            scope.targetDeviceAlias.value = null;
                        }
                    } else {
                        scope.targetDeviceAlias.value = null;
                    }
                }

                scope.settings = ngModelCtrl.$viewValue.settings;

                scope.updateSchemaForm();

                scope.updateDatasourcesAccordionState();
            }
        };

        scope.displayAdvanced = function() {
            return scope.widgetSettingsSchema && scope.widgetSettingsSchema.schema;
        }

        scope.updateSchemaForm = function() {
            if (scope.widgetSettingsSchema && scope.widgetSettingsSchema.schema) {
                scope.currentSettingsSchema = scope.widgetSettingsSchema.schema;
                scope.currentSettingsForm = scope.widgetSettingsSchema.form || angular.copy(scope.defaultSettingsForm);
                scope.currentSettings = scope.settings;
            } else {
                scope.currentSettingsForm = angular.copy(scope.defaultSettingsForm);
                scope.currentSettingsSchema = angular.copy(scope.emptySettingsSchema);
                scope.currentSettings = {};
            }
        }

        scope.$on('datasources-accordion:onReady', function () {
            if (scope.updateDatasourcesAccordionStatePending) {
                scope.updateDatasourcesAccordionState();
            }
        });

        scope.updateValidity = function () {
            if (ngModelCtrl.$viewValue) {
                var value = ngModelCtrl.$viewValue;
                var valid;
                if (scope.widgetType === types.widgetType.rpc.value) {
                    valid = value && value.targetDeviceAliasIds && value.targetDeviceAliasIds.length > 0;
                    ngModelCtrl.$setValidity('targetDeviceAliasIds', valid);
                } else {
                    valid = value && value.datasources && value.datasources.length > 0;
                    ngModelCtrl.$setValidity('datasources', valid);
                }
            }
        };

        scope.$watch('title + showTitle + backgroundColor + color + padding + intervalSec', function () {
            if (ngModelCtrl.$viewValue) {
                var value = ngModelCtrl.$viewValue;
                value.title = scope.title;
                value.showTitle = scope.showTitle;
                value.backgroundColor = scope.backgroundColor;
                value.color = scope.color;
                value.padding = scope.padding;
                value.intervalSec = scope.intervalSec;
                ngModelCtrl.$setViewValue(value);
            }
        });

        scope.$watch('currentSettings', function () {
            if (ngModelCtrl.$viewValue) {
                var value = ngModelCtrl.$viewValue;
                value.settings = scope.currentSettings;
                ngModelCtrl.$setViewValue(value);
            }
        }, true);

        scope.$watch('timewindow', function () {
            if (ngModelCtrl.$viewValue) {
                var value = ngModelCtrl.$viewValue;
                value.timewindow = scope.timewindow;
                ngModelCtrl.$setViewValue(value);
            }
        }, true);

        scope.$watch('datasources', function () {
            if (ngModelCtrl.$viewValue && scope.widgetType !== types.widgetType.rpc.value) {
                var value = ngModelCtrl.$viewValue;
                if (value.datasources) {
                    value.datasources.splice(0, value.datasources.length);
                } else {
                    value.datasources = [];
                }
                if (scope.datasources) {
                    for (var i in scope.datasources) {
                        value.datasources.push(scope.datasources[i].value);
                    }
                }
                ngModelCtrl.$setViewValue(value);
                scope.updateValidity();
            }
        }, true);

        scope.$watch('targetDeviceAlias.value', function () {
            if (ngModelCtrl.$viewValue && scope.widgetType === types.widgetType.rpc.value) {
                var value = ngModelCtrl.$viewValue;
                if (scope.targetDeviceAlias.value) {
                    value.targetDeviceAliasIds = [scope.targetDeviceAlias.value.id];
                } else {
                    value.targetDeviceAliasIds = [];
                }
                ngModelCtrl.$setViewValue(value);
                scope.updateValidity();
            }
        });

        scope.addDatasource = function () {
            var newDatasource;
            if (scope.functionsOnly) {
                newDatasource = angular.copy(utils.getDefaultDatasource(scope.datakeySettingsSchema.schema));
                newDatasource.dataKeys = [scope.generateDataKey('Sin', types.dataKeyType.function)];
            } else {
                newDatasource = { type: types.datasourceType.device,
                    dataKeys: []
                };
            }
            var datasource = {value: newDatasource};
            scope.datasources.push(datasource);
            if (scope.theForm) {
                scope.theForm.$setDirty();
            }
        }

        scope.removeDatasource = function ($event, datasource) {
            var index = scope.datasources.indexOf(datasource);
            if (index > -1) {
                scope.datasources.splice(index, 1);
                if (scope.theForm) {
                    scope.theForm.$setDirty();
                }
            }
        };

        scope.updateDatasourcesAccordionState = function () {
            if (scope.widgetType !== types.widgetType.rpc.value) {
                if (scope.datasourcesAccordion) {
                    scope.updateDatasourcesAccordionStatePending = false;
                    var expand = scope.datasources && scope.datasources.length < 4;
                    if (expand) {
                        scope.datasourcesAccordion.expand('datasources-pane');
                    } else {
                        scope.datasourcesAccordion.collapse('datasources-pane');
                    }
                } else {
                    scope.updateDatasourcesAccordionStatePending = true;
                }
            }
        }

        scope.generateDataKey = function (chip, type) {

            if (angular.isObject(chip)) {
                chip._hash = Math.random();
                return chip;
            }

            var result = {
                name: chip,
                type: type,
                label: scope.genNextLabel(chip),
                color: scope.genNextColor(),
                settings: {},
                _hash: Math.random()
            };

            if (type === types.dataKeyType.function) {
                result.name = 'f(x)';
                result.funcBody = utils.getPredefinedFunctionBody(chip);
                if (!result.funcBody) {
                    result.funcBody = "return prevValue + 1;";
                }
            }

            if (angular.isDefined(scope.datakeySettingsSchema.schema)) {
                result.settings = jsonSchemaDefaults(scope.datakeySettingsSchema.schema);
            }

            return result;
        };

        scope.genNextLabel = function (name) {
            var label = name;
            var value = ngModelCtrl.$viewValue;
            var i = 1;
            var matches = false;
            do {
                matches = false;
                if (value.datasources) {
                    for (var d in value.datasources) {
                        var datasource = value.datasources[d];
                        for (var k in datasource.dataKeys) {
                            var dataKey = datasource.dataKeys[k];
                            if (dataKey.label === label) {
                                i++;
                                label = name + ' ' + i;
                                matches = true;
                            }
                        }
                    }
                }
            } while (matches);
            return label;
        }

        scope.genNextColor = function () {
            var i = 0;
            var value = ngModelCtrl.$viewValue;
            if (value.datasources) {
                for (var d in value.datasources) {
                    var datasource = value.datasources[d];
                    i += datasource.dataKeys.length;
                }
            }
            return utils.getMaterialColor(i);
        }

        $compile(element.contents())(scope);
    }
    return {
        restrict: "E",
        require: "^ngModel",
        scope: {
            forceExpandDatasources: '=?',
            widgetType: '=',
            widgetSettingsSchema: '=',
            datakeySettingsSchema: '=',
            deviceAliases: '=',
            functionsOnly: '=',
            fetchDeviceKeys: '&',
            onCreateDeviceAlias: '&',
            theForm: '='
        },
        link: linker
    };
}

/* eslint-enable angular/angularelement */
