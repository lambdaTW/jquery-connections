(function($) {
  $.fn.connections = function(options) {
    if (options === "update") {
      return processConnections(update, this);
    } else if (options === "remove") {
      return processConnections(destroy, this);
    } else {
      options = $.extend(
        true,
        {
          borderClasses: {},
          class: "connection",
          css: {},
          from: this,
          tag: "connection",
          to: this,
          within: ":root"
        },
        options
      );
      connect(options);
      return this;
    }
  };

  $.event.special.connections = {
    teardown: function(namespaces) {
      processConnections(destroy, $(this));
    }
  };

  var connect = function(options) {
    var borderClasses = options.borderClasses;
    var tag = options.tag;
    var end1 = $(options.from);
    var end2 = $(options.to);
    var within = $(options.within);
    delete options.borderClasses;
    delete options.tag;
    delete options.from;
    delete options.to;
    delete options.within;
    within.each(function() {
      var container = this;
      var done = new Array();
      end1.each(function() {
        var node = this;
        done.push(this);
        end2.not(done).each(function() {
          createConnection(
            container,
            [node, this],
            tag,
            borderClasses,
            options
          );
        });
      });
    });
  };

  var createConnection = function(
    container,
    nodes,
    tag,
    borderClasses,
    options
  ) {
    var css = $.extend({ position: "absolute" }, options.css);
    var connection = $("<" + tag + "/>", options).css(css);
    connection.appendTo(container);

    var sum_border_width = (connection.outerWidth() - connection.innerWidth()) / 2;
    var sum_border_height = (connection.outerHeight() - connection.innerHeight()) / 2;

    if (sum_border_width <= 0 && sum_border_height <= 0) {
      sum_border_width = sum_border_height = 1;
    }

    var data = {
      borderClasses: borderClasses,
      sum_border_height: sum_border_height,
      sum_border_width: sum_border_width,
      node_from: $(nodes[0]),
      node_to: $(nodes[1]),
      nodes_dom: nodes,
      css: css
    };

    if ("none" === connection.css("border-top-style")) {
      data.css.borderStyle = "solid";
    }
    $.data(connection.get(0), "connection", data);
    $.data(connection.get(0), "connections", [connection.get(0)]);
    for (var i = 0; i < 2; i++) {
      var connections = connection.add($.data(nodes[i], "connections")).get();
      $.data(nodes[i], "connections", connections);
      if (connections.length == 1) {
        $(nodes[i]).on("connections.connections", false);
      }
    }
    update(connection.get(0));
  };

  var destroy = function(connection) {
    var nodes = $.data(connection, "connection").nodes_dom;
    for (var i = 0; i < 2; i++) {
      var connections = $($.data(nodes[i], "connections"))
        .not(connection)
        .get();
      $.data(nodes[i], "connections", connections);
    }
    $(connection).remove();
  };

  var getState = function(data) {
    data.rect_from = data.nodes_dom[0].getBoundingClientRect();
    data.rect_to = data.nodes_dom[1].getBoundingClientRect();
    var cached = data.cache;
    data.cache = [
      data.rect_from.top,
      data.rect_from.right,
      data.rect_from.bottom,
      data.rect_from.left,
      data.rect_to.top,
      data.rect_to.right,
      data.rect_to.bottom,
      data.rect_to.left
    ];
    data.hidden =
      0 === (data.cache[0] | data.cache[1] | data.cache[2] | data.cache[3]) ||
      0 === (data.cache[4] | data.cache[5] | data.cache[6] | data.cache[7]);
    data.unmodified = true;
    if (cached === undefined) {
      return (data.unmodified = false);
    }
    for (var i = 0; i < 8; i++) {
      if (cached[i] !== data.cache[i]) {
        return (data.unmodified = false);
      }
    }
  };

  var update = function(connection) {
    const hidden = 0
    const show = 1
    var data = $.data(connection, "connection");
    getState(data);
    if (data.unmodified) {
      return;
    }
    var sum_border_height = data.sum_border_height;
    var sum_border_width = data.sum_border_width;
    var from = data.rect_from;
    var to = data.rect_to;
    var from_y_middle = (from.bottom + from.top) / 2; // from-container's vertical middle
    var to_x_middle = (to.left + to.right) / 2; // to-container's horizontal middle
    var to_y_middle = (to.bottom + to.top) / 2; // to-container's vertical middle
    var from_x_middle = (from.left + from.right) / 2; // from-container's horizontal middle

    // from -- to |=> [hidden: "right", show: "left"]
    // to -- from |=> [hidden: "left", show: "right"]
    var horizontal = ["right", "left"];
    if (from_x_middle > to_x_middle) { // from-container on to-container's right
      horizontal = ["left", "right"];
      var new_from_x_middle = Math.max(
          to_x_middle - sum_border_width / 2,
          Math.min(from.right, to.right)
      );
      to_x_middle = from_x_middle + sum_border_width / 2;
      from_x_middle = new_from_x_middle;
    } else {                 // **to-container on from-container's right
      from_x_middle -= sum_border_width / 2;
      to_x_middle = Math.min(
          to_x_middle + sum_border_width / 2,
          Math.max(from.left, to.left)
      );
    }
    /*
      from                            | to
      to                              | from
      [hidden: "top", show: "bottom"] | [hidden: "bottom", show: "top"]
    */
    var vertical = ["bottom", "top"];
    if (to_y_middle > from_y_middle) { // **to-container on from-container's bottom
      vertical = ["top", "bottom"];
      var new_to_y_middle = Math.max(
          from_y_middle - sum_border_height / 2,
          Math.min(from.bottom, to.bottom)
      );
      from_y_middle = to_y_middle + sum_border_height / 2;
      to_y_middle = new_to_y_middle;
    } else {                    // from-container on to-container's bottom
      from_y_middle = Math.min(
          from_y_middle,
          Math.max(from.top, to.top)
      );
      to_y_middle -= sum_border_height / 2;
    }
    var width = to_x_middle - from_x_middle;
    var height = from_y_middle - to_y_middle;
    if (width < sum_border_width) { // width of nodes distance less than conn border
      to_y_middle = Math.max(
          to_y_middle,
          Math.min(from.bottom, to.bottom)
      );
      from_y_middle = Math.min(
          from_y_middle,
          Math.max(from.top, to.top)
      );
      from_x_middle = Math.max(from.left, to.left);
      to_x_middle = Math.min(from.right, to.right);
      to_x_middle = from_x_middle = (
          from_x_middle + to_x_middle - sum_border_width
      ) / 2;
    }
    if (height < sum_border_height) { // height of nodes distance less than conn border
      from_x_middle = Math.max(from_x_middle, Math.min(from.right, to.right));
      to_x_middle = Math.min(to_x_middle, Math.max(from.left, to.left));
      to_y_middle = Math.max(from.top, to.top);
      from_y_middle = Math.min(from.bottom, to.bottom);
      from_y_middle = to_y_middle = (to_y_middle + from_y_middle - sum_border_height) / 2;
    }
    width = to_x_middle - from_x_middle;
    height = from_y_middle - to_y_middle;
    width <= 0 && (sum_border_height = 0);
    height <= 0 && (sum_border_width = 0);
    var style =
      "border-" +
      vertical[hidden] +             // "bottom" or "top"
      "-" +
      horizontal[hidden] +           // "left" or "right"
      "-radius: 0;" +
      "border-" +
      vertical[hidden] +             // "bottom" or "top"
      "-" +
      horizontal[show] +           // "left" or "right"
      "-radius: 0;" +
      "border-" +
      vertical[show] +             // "bottom" or "top"
      "-" +
      horizontal[hidden] +           // "left" or "right"
      "-radius: 0;";
    /*
      style is
      border-bottom-radius: 0;
      border-top-radius: 0;
      border-left-radius: 0;
      border-right-radius: 0;
     */
    (sum_border_height <= 0 || sum_border_width <= 0) &&
      (style += "border-" + vertical[show] + "-" + horizontal[show] + "-radius: 0;");
    if (data.hidden) {
      style += "display: none;";
    } else {
      /* When from Set border-top-width: 0
               |
               v
               to
      */
      data.css["border-" + vertical[hidden] + "-width"] = 0;
      /* When from -> to
         Set border-right-width: 0
      */
      data.css["border-" + horizontal[hidden] + "-width"] = 0;
      /*
        hidden: right, top
        from      | border-top-width: 0
         │        | border-bottom-width: sum_border_height
         │        | border-right-width: 0
         └───>to  | border-left-width: sum_border_width

        hidden: left, bottom
        to<────┐  | border-top-width: sum_border_height
               │  | border-bottom-width: 0
               │  | border-right-width: sum_border_width
             from | border-left-width: 0

        hidden: right, bottom
        ┌─────>to | border-top-width: sum_border_height
        │         | border-bottom-width: 0
        │         | border-right-width: 0
        from      | border-left-width: sum_border_width

        hidden: left, top
             from | border-top-width: sum_border_height
              │   | border-bottom-width: 0
              │   | border-right-width: 0
       to<────┘   | border-left-width: sum_border_width
       */

      data.css["border-" + vertical[show] + "-width"] = sum_border_height;
      data.css["border-" + horizontal[show] + "-width"] = sum_border_width;
      var current_rect = connection.getBoundingClientRect();
      data.css.left = connection.offsetLeft + from_x_middle - current_rect.left;
      data.css.top = connection.offsetTop + to_y_middle - current_rect.top;
      data.css.width = width - sum_border_width;
      data.css.height = height - sum_border_height;
    }
    var bc = data.borderClasses;
    $(connection)
      .removeClass(bc[vertical[hidden]])
      .removeClass(bc[horizontal[hidden]])
      .addClass(bc[vertical[show]])
      .addClass(bc[horizontal[show]])
      .attr("style", style)
      .css(data.css);
  };

  var processConnections = function(method, elements) {
    return elements.each(function() {
      var connections = $.data(this, "connections");
      if (connections instanceof Array) {
        for (var i = 0, len = connections.length; i < len; i++) {
          method(connections[i]);
        }
      }
    });
  };
})(jQuery);
