import Furniture from "./Furniture.js";

class Sofa extends Furniture {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this._image = new Image();
        this._image.src = "../assets/sofa.png";
    }

    get image() {
        return this._image;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    centerIn(bounds) {
        const centerX =
            (Math.min(...bounds.map((p) => p.x)) +
                Math.max(...bounds.map((p) => p.x))) /
            2;
        const centerY =
            (Math.min(...bounds.map((p) => p.y)) +
                Math.max(...bounds.map((p) => p.y))) /
            2;
        this.setPosition(centerX - this.width / 2, centerY - this.height / 2);
        this.logState("Centered in bounds");
    }

    logState(message = "") {
        super.logState(message);
        console.log("Image loaded:", this.image.complete);
    }
}

export default Sofa;
