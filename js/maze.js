/* 	demo.js http://github.com/bgrins/javascript-astar
	MIT License
	
	Set up the demo page for the A* Search
*/

window.log = function () {
  if (this.console) {
    console.log(Array.prototype.slice.call(arguments));
  }
};

var generateRandom = function (width, height, wallFrequency) {
  var nodes = [];

  for (var x = 0; x < width; x++) {
    var nodeRow = [];
    var gridRow = [];

    for (var y = 0; y < height; y++) {
      var isWall = Math.floor(Math.random() * (1 / wallFrequency));
      if (isWall == 0) {
        nodeRow.push(GraphNodeType.WALL);
      } else {
        nodeRow.push(GraphNodeType.OPEN);
      }
    }
    nodes.push(nodeRow);
  }

  return new Graph(nodes);
};

$(function () {
  var $grid = $("#search_grid");
  var $selectWallFrequency = $("#selectWallFrequency");
  var $selectGridSize = $("#selectGridSize");
  var $checkDebug = $("#checkDebug");
  var $searchDiagonal = $("#searchDiagonal");

  var opts = {
    wallFrequency: $selectWallFrequency.val(),
    gridSize: $selectGridSize.val(),
    debug: $checkDebug.is("checked"),
    diagonal: $searchDiagonal.is("checked"),
  };

  var grid = new GraphSearch($grid, opts, astar.search);

  $("#btnClear").click(function () {
    grid.initialize();
  });
  $("#btnGenerate").click(function () {
    grid.initialize(true);
  });
  $("#btnCreateWall").click(function () {
    grid.$graph.find("." + css.active).removeClass(css.active);
    mode = "wall";
    document.getElementById("btnFind").classList.remove("btn-success");
    document.getElementById("btnCreateWall").classList.add("btn-success");
    $("#message").text("Click on a grid position to create wall");
    console.log("Wall mode");
  });
  $("#btnFind").click(function () {
    mode = "find";
    document.getElementById("btnCreateWall").classList.remove("btn-success");
    document.getElementById("btnFind").classList.add("btn-success");
    $("#message").text("Click on a grid position to find path");
    console.log("Find mode");
  });
  $("#btnDelPath").click(function () {
    grid.$graph.find("." + css.active).removeClass(css.active);
  });

  $selectWallFrequency.change(function () {
    grid.setOption({ wallFrequency: $(this).val() });
    grid.initialize();
  });

  $selectGridSize.change(function () {
    grid.setOption({ gridSize: $(this).val() });
    grid.initialize();
  });

  $checkDebug.change(function () {
    grid.setOption({ debug: $(this).is(":checked") });
  });

  $searchDiagonal.change(function () {
    grid.setOption({ diagonal: $(this).is(":checked") });
  });
  $("#generateWeights").click(function () {
    if ($("#generateWeights").prop("checked")) {
      $("#weightsKey").slideDown();
    } else {
      $("#weightsKey").slideUp();
    }
  });
});

var css = { start: "start", finish: "finish", wall: "wall", active: "active" };
var mode = "wall";

function GraphSearch($graph, options, implementation) {
  this.$graph = $graph;
  this.search = implementation;
  this.opts = $.extend(
    { wallFrequency: 0.1, debug: true, gridSize: 10 },
    options
  );
  this.initialize();
}
GraphSearch.prototype.setOption = function (opt) {
  this.opts = $.extend(this.opts, opt);
  if (opt["debug"] || opt["debug"] == false) {
    this.drawDebugInfo(opt["debug"]);
  }
};
GraphSearch.prototype.initialize = function (random = false) {
  var self = this;
  this.grid = [];
  var nodes = [];
  var $graph = this.$graph;

  $graph.empty();

  var cellWidth = $graph.width() / this.opts.gridSize; // -2 for border
  var cellHeight = $graph.height() / this.opts.gridSize;
  var $cellTemplate = $("<span />")
    .addClass("grid_item")
    .width(cellWidth)
    .height(cellHeight);
  var startSet = false;

  for (var x = 0; x < this.opts.gridSize; x++) {
    var $row = $("<div class='clear' />");

    var nodeRow = [];
    var gridRow = [];

    for (var y = 0; y < this.opts.gridSize; y++) {
      var id = "cell_" + x + "_" + y;
      var $cell = $cellTemplate.clone();
      $cell.attr("id", id).attr("x", x).attr("y", y);
      $row.append($cell);
      gridRow.push($cell);

      var isWall = random
        ? Math.floor(Math.random() * (1 / self.opts.wallFrequency))
        : null;
      //   var isWall = null;
      if (isWall == 0) {
        nodeRow.push(GraphNodeType.WALL);
        $cell.addClass(css.wall);
      } else {
        var cell_weight = $("#generateWeights").prop("checked")
          ? Math.floor(Math.random() * 3) * 2 + 1
          : 1;
        nodeRow.push(cell_weight);
        $cell.addClass("weight" + cell_weight);
        if ($("#displayWeights").prop("checked")) {
          $cell.html(cell_weight);
        }
        if (!startSet) {
          $cell.addClass(css.start);
          startSet = true;
        }
      }
    }
    $graph.append($row);

    this.grid.push(gridRow);

    nodes.push(nodeRow);
  }
  this.graph = new Graph(nodes);

  // bind cell event, set start/wall positions
  this.$cells = $graph.find(".grid_item");
  //   this.$cells.click(function () {
  // 	self.cellClicked($(this), mode);
  //   });
  let clicking = false;
  this.$cells.mousedown(function (e) {
    console.log("down");
    clicking = true;
    self.cellClicked($(this), mode);
  });
  this.$cells.mouseup(function (e) {
    console.log("up");
    clicking = false;
  });
  $("#search_grid").mouseleave(function (e) {
    clicking = false;
  });

  this.$cells.mouseenter(function (e) {
    if (clicking) self.cellClicked($(this), mode);
  });
};
GraphSearch.prototype.cellClicked = function ($end, status) {
  switch (status) {
    case "find": {
      var end = this.nodeFromElement($end);

      if ($end.hasClass(css.wall) || $end.hasClass(css.start)) {
        log("clicked on wall or start...", $end);
        return;
      }

      this.$cells.removeClass(css.finish);
      $end.addClass("finish");
      var $start = this.$cells.filter("." + css.start);
      var start = this.nodeFromElement($start);

      var sTime = new Date();
      var path = this.search(this.graph.nodes, start, end, this.opts.diagonal);
      var fTime = new Date();

      if (!path || path.length == 0) {
        $("#message").text("couldn't find a path (" + (fTime - sTime) + "ms)");
        this.animateNoPath();
      } else {
        $("#message").text("search took " + (fTime - sTime) + "ms.");
        if (this.opts.debug) {
          this.drawDebugInfo(this.opts.debug);
        }
        this.animatePath(path);
      }
      break;
    }

    case "wall":
      {
        var wall = this.nodeFromElement($end);
        var calssName = $end.attr("class").split(/\s+/);
        if (wall.type !== 0) {
          $end.removeClass(calssName[1]).addClass("wall");
          wall.type = 0;
        } else {
          var cell_weight = $("#generateWeights").prop("checked")
            ? Math.floor(Math.random() * 3) * 2 + 1
            : 1;
          $end.removeClass(calssName[1]).addClass("weight" + cell_weight);
          wall.type = cell_weight;
        }

        this.setWalltoNode(wall);
      }

      break;
    default:
      break;
  }
};
GraphSearch.prototype.drawDebugInfo = function (show) {
  this.$cells.html(" ");
  var that = this;
  if (show) {
    that.$cells.each(function (i) {
      var node = that.nodeFromElement($(this));
      var debug = false;
      if (node.visited) {
        debug = "F: " + node.f + "<br />G: " + node.g + "<br />H: " + node.h;
      }

      if (debug) {
        $(this).html(debug);
      }
    });
  }
};
GraphSearch.prototype.nodeFromElement = function ($cell) {
  return this.graph.nodes[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};
GraphSearch.prototype.setWalltoNode = function ($cell) {
  this.graph.nodes[parseInt($cell.pos.x)][parseInt($cell.pos.y)] = $cell;
};
GraphSearch.prototype.animateNoPath = function () {
  var $graph = this.$graph;
  var jiggle = function (lim, i) {
    if (i >= lim) {
      $graph.css("top", 0).css("left", 0);
      return;
    }
    if (!i) i = 0;
    i++;
    $graph.css("top", Math.random() * 6).css("left", Math.random() * 6);
    setTimeout(function () {
      jiggle(lim, i);
    }, 5);
  };
  jiggle(15);
};
GraphSearch.prototype.animatePath = function (path) {
  //Couting
  let startTime = Date.now();
  var interval = setInterval(function () {
    var elapsedTime = Date.now() - startTime;
    if (elapsedTime >= 1000)
      $("#message").text(
        "search took " + (elapsedTime / 1000).toFixed(3) + "s."
      );
    else $("#message").text("search took " + elapsedTime + "ms.");
  }, 100);

  this.$graph.find("." + css.active).removeClass(css.active);
  var grid = this.grid;
  var timeout = 1000 / grid.length;
  var elementFromNode = function (node) {
    return grid[node.x][node.y];
  };

  var removeClass = function (path, i) {
    if (i >= path.length) return;
    // elementFromNode(path[i]).removeClass(css.active);
    // setTimeout( function() { removeClass(path, i+1) }, timeout*path[i].cost);
  };
  var addClass = function (path, i) {
    if (i >= path.length) {
      // Finished showing path, now remove
      // End Couting
      clearInterval(interval);
      return removeClass(path, 0);
    }
    elementFromNode(path[i]).addClass(css.active);
    setTimeout(function () {
      addClass(path, i + 1);
    }, timeout * path[i].cost);
  };

  addClass(path, 0);
  this.$graph
    .find("." + css.start)
    .removeClass(css.start)
    .addClass(css.active);
  this.$graph
    .find("." + css.finish)
    .removeClass(css.finish)
    .addClass(css.start);
};
