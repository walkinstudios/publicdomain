customElements.define('tetra-anim',
  class extends HTMLElement {
    static get observedAttributes() {
      return ['hue', 'axes']
    }
    constructor() {
      super();
      const template = document.getElementById('tetra-anim')
      const templateContent = template.content
      this.attachShadow({mode: 'open'}).appendChild(
        templateContent.cloneNode(true)
      )
    }
    connectedCallback() {
      this.hue = Number(this.getAttribute('hue')) || 5 /* hue for 3D shape faces */
      this.axes = this.getAttribute('axes')?.split(',').map(i => Number(i)) || [1, 1, 1] /* default rotate axis */
      this.render()
    }
    render() {
      // https://codepen.io/thebabydino/pen/yVJYMd
      let CSIZE = 50 /* canvas size */,
          OFF = .5*CSIZE /* canvas origin offset */,
          VPOINT = 2*CSIZE /* vanishing point */, 
          _c = this.shadowRoot.querySelector('canvas'),
          ct = _c.getContext('2d');
      let s3d /* 3D shape */, 
          rot = this.axes,
          hue = this.hue,
          ang = .005*Math.PI /* default unit rotation */, 
          rID = null /* request ID */, 
          drag = false /* drag status */, 
          sol = false /* status on lock */, 
          /* coords when starting drag */
          x0 = null, y0 = null;

      let Point = function(x = 0, y = 0, z = 0) {
        let c = [] /* natural set of coords */, 
            /*
              * coords flattened to plane, 
              * taking perspective into account
              */
            p = [];

        this.setCoords = function(x, y, z) {
          let f = z/VPOINT + 1;

          c = [x, y, z];
          p = [f*x, f*y, z];
        };

        this.getCoords = function(f = 1) {
          return f ? c : p;
        };

        this.setCoords(x, y, z);
      };

      let Polygon = function(v) {
        let n = v.length /* number of poly vertices */, 
            o = [0, 0, 0] /* central point of poly */;

        /* recompute central point coordinates */
        this.refreshO = function() {
          o = [0, 0, 0];

          for(let i = 0; i < n; i++) {
            o = o.map((c, j) => c + v[i].getCoords()[j]);
          }
        };

        /* get central point coordinates */
        this.getO = function() {
          return o;
        };

        /* draw this polygon */
        this.draw = function() {
          let /* 
                * sign of central point z coord 
                * + leads to lightening
                * - leads to darkening
                */
              s = Math.sign(o[2]), 
              /* fill lightness */
              l = 50 + s*(1 - Math.hypot(...o.slice(0, 2))/(.5*CSIZE))*35;

          ct.fillStyle = `hsl(${hue},75%,${l}%)`;
          ct.beginPath();

          for(let i = 0; i < n; i++) {
            let c = v[i].getCoords(0);

            c.splice(2, 1); /* remove the z coord */
            ct[(i ? 'line' : 'move') + 'To'](...c);
          }

          ct.closePath();
          ct.fill();
          ct.stroke();
        };
      };

      let S4hedron = function(rc = .64*OFF) {
        let v = [] /* array to store vertices */,
            f = [] /* array to store faces */,
            n = 4 /* no. of faces (or vertices) */;

        /* 
          * rotate the faces in 3D 
          * a = angle of rotation
          * r = vector around which rotation happens
          */
        this.rot = function(a = ang, r = this.axes) {
          /* 
            * explanation for variables
            * http://stackoverflow.com/a/15208858/1397351 
            */
          let sc = .5*Math.sin(a), 
              db = 1 - Math.cos(a) /* double sq */, 
              sq = .5*db, 
              /* get the x*y*sq, y*z*sq, z*x*sq in SO answer */
              b = r.map((c, i, a) => c*a[(i + 1)%3]*sq), 
              /* get the x*sc, y*sc, z*sc in SO answer */
              c = r.map(c => c*sc), 
              m = [ /* the transform matrix */
                [
                  1 - db*(r[1]*r[1] + r[2]*r[2]), 
                  2*(b[0] - c[2]), 
                  2*(b[2] + c[1])
                ], 
                [
                  2*(b[0] + c[2]), 
                  1 - db*(r[0]*r[0] + r[2]*r[2]), 
                  2*(b[1] - c[0])
                ], 
                [
                  2*(b[2] - c[1]), 
                  2*(b[1] + c[0]), 
                  1 - db*(r[0]*r[0] + r[1]*r[1])
                ]
              ];

          for(let i = 0; i < n; i++) {
            let /* coords before the rotation */
                c0 = v[i].getCoords(), 
                /* 
                  * multiply matrix m to vector c0 
                  * see https://codepen.io/thebabydino/pen/WoxvPy
                  * to get coords after the rotation
                  */
                c1 = m.map(c => c.map((c, i) => c*c0[i]).reduce((p, c) => p+c, 0));

            v[i].setCoords(...c1);
          }

          /* compute central point for each face */
          /* all convex, so it's enough :P  */
          for(let i = 0; i < n; i++)
            f[i].refreshO();

          sortFaces();
          this.draw();
        };

        this.draw = function() {
          ct.clearRect(-OFF, -OFF, CSIZE, CSIZE);

          for(let i = 0; i < n; i++)
            f[i].draw();
        };

        /*
          * reorder faces in array based on 
          * z coord values
          * of the faces' central points
          */
        function sortFaces() {
          f.sort((a, b) => {
            if(a.getO()[2] > b.getO()[2])
              return 1;
            if(a.getO()[2] < b.getO()[2])
              return -1;
            return 0;
          });
        };

        /* 
          * create each face from vertices
          * and add each face to f array
          */
        function addFaces() {
          for(let i = 0; i < n; i++) {
            /* current face vertices */
            let fv = v.slice();

            fv.splice(i, 1);
            f.push(new Polygon(fv));
          }
        };

        /* 
          * compute coords for each vertex
          * and add each vertex to v array
          */
        (function addVertices() {
          let /* 
                * containing cube inradius
                * (tetrahedron midradius)
                */
              ri6 = rc/Math.sqrt(3), 
              /* 
                * containing cube face circumradius
                * (half of tetrahedron edge)
                */
              rcf6 = ri6*Math.SQRT2;

          /* 2 vertices on top, 2 at the bottom */
          for(let i = 0; i < 2; i++) {
            /* y coord */
            let y = Math.round(Math.pow(-1, i)*ri6);

            for(let j = 0; j < 2; j++) {
              let /* signed base value */
                  b = Math.round(Math.pow(-1, j)*rcf6), 
                  x = i*b /* x coord */, 
                  z = (1 - i)*b /* z coord */

              v.push(new Point(x, y, z));
            }
          }

          addFaces();
        })();
      };

      function ani() {
        hue = this.hue
        s3d.rot(ang, this.axes);
        rID = requestAnimationFrame(ani);
      };
      
      ani = ani.bind(this)


      /* set canvas dimensions */
      _c.width = _c.height = CSIZE;

      /* put 0,0 point in the middle of canvas */
      ct.translate(OFF, OFF);
      /* set global alpha of strokes and fills */
      ct.globalAlpha = .87;
      /* set rgba value for edges */
      ct.strokeStyle = 'rgba(0,0,0,.1)'

      /* create tetrahedron object */
      s3d = new S4hedron;

      /* start animation */
      ani();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if(name === 'axes') {
        this.axes = newValue.split(',').map(i => Number(i))
      } else {
        this.hue = Number(newValue)
      }
    }
  }
);