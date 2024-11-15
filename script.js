const canvas = document.getElementById('roomCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start');

let points = [];
let isDrawing = false;
let isDraggingSofa = false;
let sofaImage = new Image();
sofaImage.src = 'assets/sofa.png';
let sofa = null;
let mouseOffset = { x: 0, y: 0 };
let magnetDistance = 30;

function drawPolygon(points, isFinal = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1) {
        const path = new Path2D();
        path.moveTo(points[0].x, points[0].y);
        points.forEach((point, i) => {
            if (i > 0) path.lineTo(point.x, point.y);
        });
        if (isFinal) path.lineTo(points[0].x, points[0].y);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke(path);

        if (isFinal) {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.fill(path);
        }
    }

    // Draw points
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    });

    // Draw sofa if it exists
    if (sofa) {
        ctx.save();
        ctx.translate(sofa.x + sofa.width / 2, sofa.y + sofa.height / 2);
        ctx.rotate(sofa.rotation);
        ctx.translate(-(sofa.x + sofa.width / 2), -(sofa.y + sofa.height / 2));
        ctx.fillStyle = 'blue';
        ctx.fillRect(sofa.x, sofa.y, sofa.width, sofa.height);
        // Draw sofa image
        ctx.drawImage(sofaImage, sofa.x, sofa.y, sofa.width, sofa.height);

        // Draw the green back line
        /* ctx.beginPath();
        ctx.moveTo(sofa.x, sofa.y);
        ctx.lineTo(sofa.x + sofa.width, sofa.y);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath(); */

        ctx.restore();
    }
}

function findMagnetPoint(x, y) {
    for (let point of points) {
        if (Math.abs(point.x - x) < 8) x = point.x;
        if (Math.abs(point.y - y) < 8) y = point.y;
    }
    return { x, y };
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
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
    return { distance: Math.sqrt(dx * dx + dy * dy), closestPoint: { x: xx, y: yy } };
}

function handleMouseMove(e) {
    const { offsetX, offsetY } = e;

    if (isDraggingSofa && sofa) {
        // Move sofa
        sofa.x = offsetX - mouseOffset.x;
        sofa.y = offsetY - mouseOffset.y;

        // Snap sofa to walls
        let minDistance = Infinity;
        let nearestWall = null;
        let nearestAngle = 0;
        let wallOffset = { x: 0, y: 0 };

        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];

            const { distance, closestPoint } = pointToLineDistance(sofa.x + sofa.width / 2, sofa.y, start.x, start.y, end.x, end.y);

            if (distance < minDistance) {
                minDistance = distance;
                nearestWall = closestPoint;
                nearestAngle = Math.atan2(end.y - start.y, end.x - start.x);
                wallOffset = {
                    x: -(end.y - start.y) / Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) * (sofa.height / 2),
                    y: (end.x - start.x) / Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) * (sofa.height / 2),
                };
            }
        }

        if (nearestWall && minDistance < magnetDistance) {
            // Snap and rotate sofa
            sofa.x = nearestWall.x - sofa.width / 2 + wallOffset.x;
            sofa.y = nearestWall.y - sofa.height / 2 + wallOffset.y;
            sofa.rotation = nearestAngle; // Rotate back side to wall
        } else {
            // Reset rotation when far from walls
            sofa.rotation = 0;
        }

        drawPolygon(points, true);
        return;
    }

    if (isDrawing) {
        const magnetPoint = findMagnetPoint(offsetX, offsetY);
        drawPolygon([...points, magnetPoint]);
    }
}

function handleMouseClick(e) {
    if (!isDrawing) return;

    const { offsetX, offsetY } = e;
    const magnetPoint = findMagnetPoint(offsetX, offsetY);

    if (points.length > 0 && Math.abs(magnetPoint.x - points[0].x) < 8 && Math.abs(magnetPoint.y - points[0].y) < 8) {
        // Close the polygon
        isDrawing = false;
        points.push(points[0]);
        drawPolygon(points, true);

        // Center sofa in the room
        const centerX = (Math.min(...points.map(p => p.x)) + Math.max(...points.map(p => p.x))) / 2;
        const centerY = (Math.min(...points.map(p => p.y)) + Math.max(...points.map(p => p.y))) / 2;
        sofa = { x: centerX - 50, y: centerY - 25, width: 100, height: 50, rotation: 0 };

        drawPolygon(points, true);
    } else {
        points.push(magnetPoint);
        drawPolygon(points);
    }
}

function handleMouseDown(e) {
    if (sofa && e.offsetX >= sofa.x && e.offsetX <= sofa.x + sofa.width && e.offsetY >= sofa.y && e.offsetY <= sofa.y + sofa.height) {
        isDraggingSofa = true;
        mouseOffset.x = e.offsetX - sofa.x;
        mouseOffset.y = e.offsetY - sofa.y;
    }
}

function handleMouseUp() {
    isDraggingSofa = false;
}

startButton.addEventListener('click', () => {
    points = [];
    isDrawing = true;
    sofa = null;
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);
    drawPolygon(points);
});

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
