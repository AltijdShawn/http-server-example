var fmt = (function() {
    function fmt(str: string, var_args: any[]) {
        var args = Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{(\d+)\}/g, function(s, match) {
            return (match in args ? args[match] : s);
        })
    }

    function obj(str: string, obj: object) {
        return str.replace(/\{([_$a-zA-z0-9][_$a-zA-z0-9]*)\}/g, function(s, match) {
            return (match in obj ? obj[match] : s)
        })
    }

    function repeat(str: string, n: number) {
        return (new Array(n + 1)).join(str)
    }

    fmt.fmt     = fmt;
    fmt.obj     = obj;
    fmt.repeat  = repeat;
    return fmt
})()

export default fmt;