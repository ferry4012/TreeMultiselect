/*
 * jQuery Tree Multiselect
 * v1.14.5
 *
 * (c) Patrick Tsai et al.
 * MIT Licensed
 */

(function($) {
  $.fn.treeMultiselect = function(opts) {
    var options = mergeDefaultOptions(opts);
    this.each(function() {
      var originalSelect = $(this);
      originalSelect.attr('multiple', '').css('display', 'none');

      var uiBuilder = new UiBuilder();
      uiBuilder.build(originalSelect);

      var selectionContainer = uiBuilder.selections;

      generateSelections(originalSelect, selectionContainer, options);

      addDescriptionHover(selectionContainer, options);
      addCheckboxes(selectionContainer, options);
      checkPreselectedSelections(originalSelect, selectionContainer, options);

      if (options.allowBatchSelection) {
        armTitleCheckboxes(selectionContainer, options);
        uncheckParentsOnUnselect(selectionContainer, options);
        checkParentsOnAllChildrenSelected(selectionContainer, options);
        showSemifilledParents(selectionContainer, options);
      }

      if (options.collapsible) {
        addCollapsibility(selectionContainer, options);
      }

      var selectedContainer = uiBuilder.selected;
      updateSelectedAndOnChange(selectionContainer, selectedContainer, originalSelect, options);

      armRemoveSelectedOnClick(selectionContainer, selectedContainer, options);
    });
    return this;
  };

  var UiBuilder = function() {};
  UiBuilder.prototype.build = function(el) {
    var tree = document.createElement('div');
    tree.className = "tree-multiselect";
    $(el).after(tree);

    var selections = document.createElement('div');
    selections.className = "selections";
	selections.innerHTML="<strong>请选择要分配的权限：</strong>"
    $(tree).append(selections);

    var selected = document.createElement('div');
    selected.className = "selected";
	selected.innerHTML = "<strong>所获权限：</strong>";
    $(tree).append(selected);

    this.tree = tree;
    this.selections = selections;
    this.selected = selected;
  };

  var Option = function(value, text, description, index) {
    this.value = value;
    this.text = text;
    this.description = description;
    this.index = index;
  };

  function mergeDefaultOptions(options) {
    var defaults = {
      allowBatchSelection: true,
      sortable: false,
      collapsible: true,
      freeze: false,
      sectionDelimiter: '/',
      showSectionOnSelected: true,
      startCollapsed: false
    };
    return $.extend({}, defaults, options);
  }

  function generateSelections(originalSelect, selectionContainer, options) {
    var data = {};

    function insertOption(path, option) {
      var currentPos = data;
      for (var i = 0; i < path.length; ++i) {
        var pathPart = path[i];

        if (!currentPos[pathPart]) {
          currentPos[pathPart] = [];
        }
        currentPos = currentPos[pathPart];

        if (i == path.length - 1) {
          currentPos.push(option);
          break;
        }

        pathPart = path[i + 1];
        var existingObj = null;
        for (var j = 0; j < currentPos.length; ++j) {
          var arrayItem = currentPos[j];
          if ((arrayItem.constructor != Option) && $.isPlainObject(arrayItem) && arrayItem[pathPart] && (typeof arrayItem[pathPart] !== 'undefined')) {
            existingObj = arrayItem;
            break;
          }
        }

        if (existingObj) {
          currentPos = existingObj;
        } else {
          var newLength = currentPos.push({});
          currentPos = currentPos[newLength - 1];
        }
      }
    }

    $(originalSelect).find("> option").each(function() {
      var path = $(this).attr('data-section').split(options.sectionDelimiter);
      var optionValue = $(this).val();
      var optionName = $(this).text();
      var optionDescription = $(this).attr('data-description');
      var optionIndex = $(this).attr('data-index');
      var option = new Option(optionValue, optionName, optionDescription, optionIndex);
      insertOption(path, option);
    });

    fillSelections.call(selectionContainer, data);
  }

  function fillSelections(data) {
    function createSection(title) {
      var section = document.createElement('div');
      section.className = "section";

      var sectionTitle = document.createElement('div');
      sectionTitle.className = "title";
      sectionTitle.innerHTML = title;

      $(section).append(sectionTitle);
      $(this).append(section);
      return section;
    }

    function createItem(option) {
      var text = option.text;
      var value = option.value;
      var description = option.description;
      var index = option.index;

      var selection = document.createElement('div');
      selection.className = "item";
      $(selection).text(text || value).attr({
        'data-value': value,
        'data-description': description,
        'data-index': index
      });
      $(this).append(selection);
    }

    if (data.constructor == Option) {
      createItem.call(this, data);
    } else if ($.isArray(data)) {
      for (var i = 0; i < data.length; ++i) {
        fillSelections.call(this, data[i]);
      }
    } else if (typeof data === 'object') {
      for (var key in data) {
        if (!data.hasOwnProperty(key)) continue;
        var section = createSection.call(this, key);
        fillSelections.call(section, data[key]);
      }
    } else {
      createItem.call(this, data);
    }
  }

  function addDescriptionHover(selectionContainer) {
    var description = $("<span class='description'>?</span>");
    var targets = $(selectionContainer).find("div.item[data-description!=''][data-description]");
    description.prependTo(targets);

    $("div.item > span.description").unbind().mouseenter(function() {
      var item = $(this).parent();
      var description = item.attr('data-description');

      var descriptionDiv = document.createElement('div');
      descriptionDiv.className = "temp-description-popup";
      descriptionDiv.innerHTML = description;

      descriptionDiv.style.position = 'absolute';

      item.append(descriptionDiv);
    }).mouseleave(function() {
      $("div.temp-description-popup").remove();
    });
  }

  function addCheckboxes(selectionContainer, options) {
    var checkbox = $('<input />', { type: 'checkbox' });
    if (options.freeze) {
      checkbox.attr('disabled', 'disabled');
    }

    var targets = null;
    if (options.allowBatchSelection) {
      targets = $(selectionContainer).find("div.title, div.item");
    } else {
      targets = $(selectionContainer).find("div.item");
    }

    checkbox.prependTo(targets);
    $(selectionContainer).find('input[type=checkbox]').click(function(e) {
      e.stopPropagation();
    });
  }

  function checkPreselectedSelections(originalSelect, selectionContainer) {
    var selectedOptions = $(originalSelect).val();
    if (!selectedOptions) return;

    var selectedOptionDivs = $(selectionContainer).find("div.item").filter(function() {
      var item = $(this);
      return selectedOptions.indexOf(item.attr('data-value')) !== -1;
    });
    $(selectedOptionDivs).find("> input[type=checkbox]").prop('checked', true);
  }

  function armTitleCheckboxes(selectionContainer) {
    var titleCheckboxes = $(selectionContainer).find("div.title > input[type=checkbox]");
    titleCheckboxes.change(function() {
      var section = $(this).closest("div.section");
      var checkboxesToBeChanged = section.find("input[type=checkbox]");
      var checked = $(this).is(':checked');
      checkboxesToBeChanged.prop('checked', checked);
    });
  }

  function uncheckParentsOnUnselect(selectionContainer) {
    var checkboxes = $(selectionContainer).find("input[type=checkbox]");
    checkboxes.change(function() {
      if ($(this).is(":checked")) return;
      var sectionParents = $(this).parentsUntil(selectionContainer, "div.section");
      sectionParents.find("> div.title > input[type=checkbox]").prop('checked', false);
    });
  }

  function checkParentsOnAllChildrenSelected(selectionContainer) {
    function check() {
      var sections = $(selectionContainer).find("div.section");
      sections.each(function() {
        var section = $(this);
        var sectionItems = section.find("div.item");
        var unselectedItems = sectionItems.filter(function() {
          var checkbox = $(this).find("> input[type=checkbox]");
          return !(checkbox.is(":checked"));
        });
        if (unselectedItems.length === 0) {
          var sectionCheckbox = $(this).find("> div.title > input[type=checkbox]");
          sectionCheckbox.prop('checked', true);
        }
      });
    }

    onCheckboxChange(selectionContainer, check);
  }

  function showSemifilledParents(selectionContainer) {
    function check() {
      var sections = $(selectionContainer).find("div.section");
      sections.each(function() {
        var section = $(this);
        var items = section.find("div.item");
        var numSelected = items.filter(function() {
          var item = $(this);
          return item.find("> input[type=checkbox]").prop('checked');
        }).length;

        var sectionCheckbox = $(this).find("> div.title > input[type=checkbox]");
        var isIndeterminate = (numSelected !== 0 && numSelected !== items.length);
        sectionCheckbox.prop('indeterminate', isIndeterminate);
      });
    }

    onCheckboxChange(selectionContainer, check);
  }

  function addCollapsibility(selectionContainer, options) {
    var hideIndicator = "-";
    var expandIndicator = "+";

    var titleDivs = $(selectionContainer).find("div.title");

    var collapseDiv = document.createElement('span');
    collapseDiv.className = "collapse-section";
    if (options.startCollapsed) {
      $(collapseDiv).text(expandIndicator);
      titleDivs.siblings().toggle();
    } else {
      $(collapseDiv).text(hideIndicator);
    }
    titleDivs.prepend(collapseDiv);

    $("span.collapse-section").unbind().click(function(e) {
      e.stopPropagation();
      var indicator = $(this).text();
      $(this).text(indicator ==  hideIndicator ? expandIndicator : hideIndicator);
      var jqTitle = $(this).parent();
      jqTitle.siblings().toggle();
    });

    titleDivs.click(function() {
      $(this).find("> span.collapse-section").trigger('click');
    });
  }

//ferry customed
  function updateSelectedAndOnChange(selectionContainer, selectedContainer, originalSelect, options) {
    function createSelectedDiv(selection) {
      var text = selection.text;
      var value = selection.value;
	  var dindex = selection.index;
      var sectionName = selection.sectionName;

      var item = document.createElement('div');
      item.className = "item";
      item.innerHTML = "&nbsp;&nbsp;"+text;

//当前结点是否已有同类标题
var af=$("div.items:contains('"+sectionName+"')");
console.log(af.length);
//如果已有同类标题，不再输出标题；否则输出标题。
if (af.length){
	//有同类标题，不再输出标题
	if (!options.freeze) {
        $(item).append("&nbsp;<span class='remove-selected'>×</span>");
    }

    $(item).attr('data-value', value).appendTo(selectedContainer);
    $(item).attr('dindex', dindex).appendTo(selectedContainer);
      
	$("div.items:contains('"+sectionName+"')").append($(item));

	//排序处理。选中权限时，与左侧树保持一致的顺序；当删除选中权限之后，再次选中权限时，仍需与左侧树保持一致。
		if ($(item).siblings().length>0)
		{
			var curdIndex = $(item).attr('dindex'); //当前id
			var arrItem =$(item).siblings('.item'); //之前有多少同级div.item
			if (arrItem.length)
			{
				arrItem.each(function(){
					if (curdIndex < $(this).attr('dindex'))
					{
						$(item).insertBefore($(this));
						return false;
					}
				});
			}
		}
	
} else {
	//没有同类标题，输出标题
    if (!options.freeze) {
		$(item).append("&nbsp;<span class='remove-selected'>×</span>");
    }

    $(item).attr('data-value', value).appendTo(selectedContainer);
	$(item).attr('dindex', dindex).appendTo(selectedContainer);
      
	$(item).wrap("<div class='items'></div>");
	
	if (options.showSectionOnSelected) {
        $(item).before("<div class='title'>【" + sectionName + "】</div>");
    }
	
}
    }

    function addNewFromSelected(selections) {
      var currentSelections = [];
      $(selectedContainer).find("div.item").each(function() {
        currentSelections.push($(this).attr('data-value'));
      });

      var selectionsNotAdded = selections.filter(function(selection) {
        return currentSelections.indexOf(selection.value) == -1;
      });

      selectionsNotAdded.forEach(function(selection) {
        createSelectedDiv(selection);
      });

      armRemoveSelectedOnClick(selectionContainer, selectedContainer);
    }

    function removeOldFromSelected(selections) {
      var selectionTexts = [];
      selections.forEach(function(selection) {
        selectionTexts.push(selection.value);
      });

      $(selectedContainer).find("div.item").each(function() {
        var selection = $(this).attr('data-value');
        if (selectionTexts.indexOf(selection) == -1) {

//查找并获得当前div.item的同级结点数$(this).siblings(".item").length
//如果当前结节是唯一结点时，连title一起删；否则只删当前结点。
if ($(this).siblings(".item").length == 0){
	//当前结节是唯一结点，连title一起删
	$(this).parent().remove();
} else{
	//否则，只删除当前结节
	$(this).remove();	
}
          
        }
      });
    }

    function updateOriginalSelect() {
      var jqOriginalSelect = $(originalSelect);

      var selected = [];
      $(selectedContainer).find("div.item").each(function() {
        selected.push($(this).attr('data-value'));
      });

      jqOriginalSelect.val(selected);

      $(originalSelect).html($(originalSelect).find("option").sort(function(a, b) {
        var aValue = selected.indexOf($(a).attr('value'));
        var bValue = selected.indexOf($(b).attr('value'));

        if (aValue > bValue) return 1;
        if (aValue < bValue) return -1;
        return 0;
      }));
    }

    function update() {
    var selectedBoxes = $(selectionContainer).find("div.item").has("> input[type=checkbox]:checked");
      var selections = [];
      selectedBoxes.each(function(box) {
        var text = textOf(this);
        var value = $(this).attr('data-value');
        var index = $(this).attr('data-index');
        $(this).attr('data-index', undefined);
        var sectionName = $.map($(this).parentsUntil(selectionContainer, "div.section").get().reverse(), function(parentSection) {
          return textOf($(parentSection).find("> div.title"));
        }).join(options.sectionDelimiter);
        selections.push({ text: text, value: value, index: index, sectionName: sectionName });
      });
      selections.sort(function(a, b) {
        var aIndex = parseInt(a.index);
        var bIndex = parseInt(b.index);
        if (aIndex > bIndex) return 1;
        if (aIndex < bIndex) return -1;
        return 0;
      });

      addNewFromSelected(selections);
      removeOldFromSelected(selections);
      updateOriginalSelect();

      if (options.sortable && !options.freeze) {
        var jqSelectedContainer = $(selectedContainer);
        jqSelectedContainer.sortable({
          update: function(event, ui) {
            updateOriginalSelect();
          }
        });
      }
    }

    onCheckboxChange(selectionContainer, update);
  }

  function armRemoveSelectedOnClick(selectionContainer, selectedContainer) {
    $(selectedContainer).find("span.remove-selected").unbind().click(function() {
      var value = $(this).parent().attr('data-value');
      var matchingSelection = $(selectionContainer).find("div.item[data-value='" + value + "']");
      var matchingCheckbox = matchingSelection.find("> input[type=checkbox]");
      matchingCheckbox.prop('checked', false);
      matchingCheckbox.trigger('change');
    });
  }

  function onCheckboxChange(selectionContainer, callback) {
    var checkboxes = $(selectionContainer).find("input[type=checkbox]");
    checkboxes.change(function() {
      callback();
    });
    callback();
  }

  function textOf(el) {
    return $(el).clone().children().remove().end().text();
  }
})(jQuery);
