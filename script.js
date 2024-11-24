// Base Furniture class that will serve as parent for specific furniture types
class Furniture {
    constructor(x, y, width, height) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._rotation = 0;
    }

    // Getters
    get x() { return this._x; }
    get y() { return this._y; }
    get width() { return this._width; }
    get height() { return this._height; }
    get rotation() { return this._rotation; }

    // Setters with validation
    set x(value) {
        if (typeof value === 'number') {
            this._x = value;
        }
    }

    set y(value) {
        if (typeof value === 'number') {
            this._y = value;
        }
    }

    set width(value) {
        if (typeof value === 'number' && value > 0) {
            this._width = value;
        }
    }

    set height(value) {
        if (typeof value === 'number' && value > 0) {
            this._height = value;
        }
    }

    set rotation(value) {
        if (typeof value === 'number') {
            this._rotation = value;
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.logState('Position updated');
    }

    setRotation(angle) {
        this.rotation = angle;
        this.logState('Rotation updated');
    }

    isPointInside(x, y) {
        return x >= this.x && 
               x <= this.x + this.width && 
               y >= this.y && 
               y <= this.y + this.height;
    }

    logState(message = '') {
        console.log(`${this.constructor.name} State ${message}:`, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation
        });
    }

    draw(ctx) {
        throw new Error('Draw method must be implemented');
    }
}

class Sofa extends Furniture {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this._image = new Image();
        this._image.src = 'assets/sofa.png';
    }

    get image() { return this._image; }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    centerIn(bounds) {
        const centerX = (Math.min(...bounds.map(p => p.x)) + Math.max(...bounds.map(p => p.x))) / 2;
        const centerY = (Math.min(...bounds.map(p => p.y)) + Math.max(...bounds.map(p => p.y))) / 2;
        this.setPosition(centerX - this.width / 2, centerY - this.height / 2);
        this.logState('Centered in bounds');
    }

    logState(message = '') {
        super.logState(message);
        console.log('Image loaded:', this.image.complete);
    }
}

class Walls {
    constructor() {
        this._points = [];
        this._thickness = 2;
        this._isComplete = false;
        this._magnetDistance = 8;
    }

    // Getters
    get points() { return [...this._points]; }
    get thickness() { return this._thickness; }
    get isComplete() { return this._isComplete; }
    get magnetDistance() { return this._magnetDistance; }

    // Setters with validation
    set thickness(value) {
        if (typeof value === 'number' && value > 0) {
            this._thickness = value;
            this.logState('Thickness updated');
        }
    }

    set magnetDistance(value) {
        if (typeof value === 'number' && value > 0) {
            this._magnetDistance = value;
            this.logState('Magnet distance updated');
        }
    }

    addPoint(x, y) {
        const magnetPoint = this.findMagnetPoint(x, y);
        
        if (this._points.length > 0 && 
            Math.abs(magnetPoint.x - this._points[0].x) < this.magnetDistance && 
            Math.abs(magnetPoint.y - this._points[0].y) < this.magnetDistance) {
            this._points.push(this._points[0]);
            this._isComplete = true;
            this.logState('Wall completed');
            return true;
        }
        
        this._points.push(magnetPoint);
        this.logState('Point added');
        return false;
    }

    getWallLengths() {
        const lengths = [];
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];
            const length = Math.sqrt(
                Math.pow(end.x - start.x, 2) + 
                Math.pow(end.y - start.y, 2)
            );
            lengths.push({
                wallIndex: i,
                length: length,
                start: { ...start },
                end: { ...end }
            });
        }
        return lengths;
    }

    findMagnetPoint(x, y) {
        let magnetX = x;
        let magnetY = y;
        
        for (let point of this._points) {
            if (Math.abs(point.x - x) < this.magnetDistance) magnetX = point.x;
            if (Math.abs(point.y - y) < this.magnetDistance) magnetY = point.y;
        }
        
        return { x: magnetX, y: magnetY };
    }

    findNearestWall(x, y) {
        let minDistance = Infinity;
        let nearestWall = null;
        let nearestAngle = 0;
        let wallIndex = -1;

        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];
            const result = this.pointToLineDistance(x, y, start.x, start.y, end.x, end.y);

            if (result.distance < minDistance) {
                minDistance = result.distance;
                nearestWall = result.closestPoint;
                nearestAngle = Math.atan2(end.y - start.y, end.x - start.x);
                wallIndex = i;
            }
        }

        return { 
            point: nearestWall, 
            distance: minDistance, 
            angle: nearestAngle,
            wallIndex: wallIndex 
        };
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? dot / lenSq : -1;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            closestPoint: { x: xx, y: yy }
        };
    }

    draw(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (this._points.length > 1) {
            const path = new Path2D();
            path.moveTo(this._points[0].x, this._points[0].y);
            
            this._points.forEach((point, i) => {
                if (i > 0) path.lineTo(point.x, point.y);
            });
            
            if (this._isComplete) path.closePath();
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = this.thickness;
            ctx.stroke(path);

            if (this._isComplete) {
                ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                ctx.fill(path);
            }
        }

        this._points.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.closePath();

            // Draw point indices for debugging
            ctx.fillStyle = 'blue';
            ctx.font = '12px Arial';
            ctx.fillText(index.toString(), point.x + 10, point.y + 10);
        });
    }

    drawWithTemporaryPoints(ctx, tempPoints) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (tempPoints.length > 1) {
            const path = new Path2D();
            path.moveTo(tempPoints[0].x, tempPoints[0].y);
            
            tempPoints.forEach((point, i) => {
                if (i > 0) path.lineTo(point.x, point.y);
            });
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = this.thickness;
            ctx.stroke(path);
        }

        // Draw points
        tempPoints.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.closePath();

            // Draw point indices for debugging
            ctx.fillStyle = 'blue';
            ctx.font = '12px Arial';
            ctx.fillText(index.toString(), point.x + 10, point.y + 10);
        });
    }

    reset() {
        this._points = [];
        this._isComplete = false;
        this.logState('Walls reset');
    }

    logState(message = '') {
        console.log(`Walls State ${message}:`, {
            points: this.points,
            thickness: this.thickness,
            isComplete: this.isComplete,
            magnetDistance: this.magnetDistance,
            wallLengths: this.getWallLengths()
        });
    }
}

class RoomPlanner {
    constructor(canvasId, startButtonId) {
        this._canvas = document.getElementById(canvasId);
        this._ctx = this._canvas.getContext('2d');
        this._startButton = document.getElementById(startButtonId);
        
        this._walls = new Walls();
        this._sofa = null;
        this._isDrawing = false;
        this._isDraggingSofa = false;
        this._mouseOffset = { x: 0, y: 0 };
        this._magnetDistance = 30;

        this.initializeEventListeners();
        this.logState('RoomPlanner initialized');
    }

    // Getters
    get canvas() { return this._canvas; }
    get ctx() { return this._ctx; }
    get walls() { return this._walls; }
    get sofa() { return this._sofa; }
    get isDrawing() { return this._isDrawing; }
    get isDraggingSofa() { return this._isDraggingSofa; }
    get magnetDistance() { return this._magnetDistance; }

    initializeEventListeners() {
        this._startButton.addEventListener('click', () => this.start());
        this._canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this._canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this._canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this._canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    start() {
        this._walls.reset();
        this._sofa = null;
        this._isDrawing = true;
        this.draw();
        this.logState('Room planning started');
    }

    handleMouseMove(e) {
        const { offsetX, offsetY } = e;

        if (this._isDraggingSofa && this._sofa) {
            this.moveSofa(offsetX, offsetY);
            this.draw();
            return;
        }

        if (this._isDrawing) {
            const tempPoints = [...this._walls.points, this._walls.findMagnetPoint(offsetX, offsetY)];
            this.draw(tempPoints);
        }
    }

    handleMouseDown(e) {
        if (this._sofa && this._sofa.isPointInside(e.offsetX, e.offsetY)) {
            this._isDraggingSofa = true;
            this._mouseOffset = {
                x: e.offsetX - this._sofa.x,
                y: e.offsetY - this._sofa.y
            };
            this.logState('Started dragging sofa');
        }
    }

    handleMouseUp() {
        if (this._isDraggingSofa) {
            this._isDraggingSofa = false;
            this.logState('Stopped dragging sofa');
        }
    }

    handleClick(e) {
        if (!this._isDrawing) return;

        const isComplete = this._walls.addPoint(e.offsetX, e.offsetY);
        
        if (isComplete) {
            this._isDrawing = false;
            this._sofa = new Sofa(0, 0, 100, 50);
            this._sofa.centerIn(this._walls.points);
            this.logState('Room completed, sofa added');
        }
        
        this.draw();
    }

    moveSofa(mouseX, mouseY) {
        this._sofa.setPosition(
            mouseX - this._mouseOffset.x,
            mouseY - this._mouseOffset.y
        );

        const nearest = this._walls.findNearestWall(
            this._sofa.x + this._sofa.width / 2,
            this._sofa.y
        );

        if (nearest.point && nearest.distance < this._magnetDistance) {
            const wallNormal = {
                x: Math.cos(nearest.angle + Math.PI / 2),
                y: Math.sin(nearest.angle + Math.PI / 2)
            };

            this._sofa.setPosition(
                nearest.point.x - this._sofa.width / 2 + wallNormal.x * this._sofa.height / 2,
                nearest.point.y - this._sofa.height / 2 + wallNormal.y * this._sofa.height / 2
            );
            this._sofa.setRotation(nearest.angle);
            
            this.logState(`Sofa snapped to wall ${nearest.wallIndex}`);
        } else {
            this._sofa.setRotation(0);
        }
    }

    draw(tempPoints = null) {
        if (tempPoints) {
            // Drawing temporary points during wall creation
            this._walls.drawWithTemporaryPoints(this._ctx, tempPoints);
        } else {
            // Normal drawing
            this._walls.draw(this._ctx);
            if (this._sofa) {
                this._sofa.draw(this._ctx);
            }
        }
    }

    logState(message = '') {
        console.log(`RoomPlanner State ${message}:`, {
            isDrawing: this._isDrawing,
            isDraggingSofa: this._isDraggingSofa,
            mouseOffset: this._mouseOffset,
            magnetDistance: this._magnetDistance,
            canvasWidth: this._canvas.width,
            canvasHeight: this._canvas.height
        });
    }

    // Debug method to get complete state
    getState() {
        return {
            walls: {
                points: this._walls.points,
                isComplete: this._walls.isComplete,
                wallLengths: this._walls.getWallLengths()
            },
            sofa: this._sofa ? {
                x: this._sofa.x,
                y: this._sofa.y,
                width: this._sofa.width,
                height: this._sofa.height,
                rotation: this._sofa.rotation
            } : null,
            canvas: {
                width: this._canvas.width,
                height: this._canvas.height
            },
            state: {
                isDrawing: this._isDrawing,
                isDraggingSofa: this._isDraggingSofa
            }
        };
    }
}

// Initialize the application
const roomPlanner = new RoomPlanner('roomCanvas', 'start');