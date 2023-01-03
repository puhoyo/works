#pragma once

class Position2D {
	double x_;
	double y_;
public:
	Position2D(double x, double y) : x_(x), y_(y) {}
	double GetX() { return x_; }
	double GetY() { return y_; }
};