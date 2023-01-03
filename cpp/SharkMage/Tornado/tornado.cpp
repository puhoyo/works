// 3 <= N <= 499
// N is odd
// 0 <= A[r][c] <= 1000
// middle is 0
//       2
//    10 7 1
// 5  a  t
//    10 7 1
//       2

#include <iostream>

int N;
int A[499][499];

int current_direction = 4;
int target_distance = 1;
int current_distance = 0;

int r, c;
int answer = 0;

void Print() {
	std::cout << "The tornado position is [" << r << "," << c << "]" << std::endl;
	for(int r = 0; r < N; r++) {
		for(int c = 0; c < N; c++) {
			std::cout << A[r][c] << "  ";
		}
		std::cout << std::endl;
	}
	std::cout << std::endl;
}

//    direction
//        1
//    12  5  6
// 4  11     7  2
//    10  9  8
//        3
void MoveSandRangeCheck(int direction, int amount) {
	switch(direction) {
		case 1:
			if(r - 2 < 0) answer += amount;
			else A[r-2][c] += amount;
			break;
		case 2:
			if(c + 3 > N) answer += amount;
			else A[r][c+2] += amount;
			break;
		case 3:
			if(r + 3 > N) answer += amount;
			else A[r+2][c] += amount;
			break;
		case 4:
			if(c - 2 < 0) answer += amount;
			else A[r][c-2] += amount;
			break;
		case 5:
			if(r - 1 < 0) answer += amount;
			else A[r-1][c] += amount;
			break;
		case 6:
			if(r - 1 < 0 || c + 2 > N) answer += amount;
			else A[r-1][c+1] += amount;
			break;
		case 7:
			if(c + 2 > N) answer += amount;
			else A[r][c+1] += amount;
			break;
		case 8:
			if(r + 2 > N || c + 2 > N) answer += amount;
			else A[r+1][c+1] += amount;
			break;
		case 9:
			if(r + 2 > N) answer += amount;
			else A[r+1][c] += amount;
			break;
		case 10:
			if(r + 2 > N || c - 1 < 0) answer += amount;
			else A[r+1][c-1] += amount;
			break;
		case 11:
			if(c - 1 < 0) answer += amount;
			else A[r][c-1] += amount;
			break;
		case 12:
			if(r - 1 < 0 || c - 1 < 0) answer += amount;
			else A[r-1][c-1] += amount;
			break;
	}
}
void MoveSand(int direction, int amount) {
	switch(direction) {
		case 1:
			A[r-2][c] += amount;
			break;
		case 2:
			A[r][c+2] += amount;
			break;
		case 3:
			A[r+2][c] += amount;
			break;
		case 4:
			A[r][c-2] += amount;
			break;
		case 5:
			A[r-1][c] += amount;
			break;
		case 6:
			A[r-1][c+1] += amount;
			break;
		case 7:
			A[r][c+1] += amount;
			break;
		case 8:
			A[r+1][c+1] += amount;
			break;
		case 9:
			A[r+1][c] += amount;
			break;
		case 10:
			A[r+1][c-1] += amount;
			break;
		case 11:
			A[r][c-1] += amount;
			break;
		case 12:
			A[r-1][c-1] += amount;
			break;
	}
}

int one_percent;
int two_percent;
int five_percent;
int seven_percent;
int ten_percent;

int current_moved_sands;

void InitSands() {
	current_moved_sands = 0;
	
	one_percent = A[r][c] * 0.01;
	two_percent = A[r][c] * 0.02;
	five_percent = A[r][c] * 0.05;
	seven_percent = A[r][c] * 0.07;
	ten_percent = A[r][c] * 0.1;
}

int main() {
	std::cin >> N;
	for(int r = 0; r < N; r++) {
		for(int c = 0; c < N; c++) {
			std::cin >> A[r][c];
		}
	}
	
	// middle
	r = N / 2;
	c = N / 2;
	
	while(1) {
		current_distance++;
		switch(current_direction) {
			case 1:
				r--;
				
				if(current_distance == target_distance) {
					target_distance++;
					current_direction = 4;
					current_distance = 0;
				}
				InitSands();

				MoveSandRangeCheck(1, five_percent);
				current_moved_sands += five_percent;
				MoveSandRangeCheck(12, ten_percent);
				current_moved_sands += ten_percent;
				MoveSandRangeCheck(6, ten_percent);
				current_moved_sands += ten_percent;
				MoveSand(4, two_percent);
				current_moved_sands += two_percent;
				MoveSand(11, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(7, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(2, two_percent);
				current_moved_sands += two_percent;
				MoveSand(10, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(8, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(5, A[r][c] - current_moved_sands);
				break;
			case 2:
				c++;
				if(current_distance == target_distance) {
					current_direction = 1;
					current_distance = 0;
				}
				InitSands();

				MoveSandRangeCheck(2, five_percent);
				current_moved_sands += five_percent;
				MoveSandRangeCheck(6, ten_percent);
				current_moved_sands += ten_percent;
				MoveSandRangeCheck(8, ten_percent);
				current_moved_sands += ten_percent;
				MoveSand(1, two_percent);
				current_moved_sands += two_percent;
				MoveSand(5, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(9, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(3, two_percent);
				current_moved_sands += two_percent;
				MoveSand(12, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(10, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(7, A[r][c] - current_moved_sands);
				break;
			case 3:
				r++;
				if(current_distance == target_distance) {
					target_distance++;
					current_direction = 2;
					current_distance = 0;
				}
				InitSands();

				MoveSandRangeCheck(3, five_percent);
				current_moved_sands += five_percent;
				MoveSandRangeCheck(8, ten_percent);
				current_moved_sands += ten_percent;
				MoveSandRangeCheck(10, ten_percent);
				current_moved_sands += ten_percent;
				MoveSand(2, two_percent);
				current_moved_sands += two_percent;
				MoveSand(7, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(11, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(4, two_percent);
				current_moved_sands += two_percent;
				MoveSand(6, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(12, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(9, A[r][c] - current_moved_sands);
				break;
			case 4:
				c--;
				if(current_distance == target_distance) {
					if(c < 0) {
						// end
						std::cout << answer << std::endl;
						exit(0);
					}
					current_direction = 3;
					current_distance = 0;
				}
				InitSands();

				MoveSandRangeCheck(4, five_percent);
				current_moved_sands += five_percent;
				MoveSandRangeCheck(10, ten_percent);
				current_moved_sands += ten_percent;
				MoveSandRangeCheck(12, ten_percent);
				current_moved_sands += ten_percent;
				MoveSand(3, two_percent);
				current_moved_sands += two_percent;
				MoveSand(9, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(5, seven_percent);
				current_moved_sands += seven_percent;
				MoveSandRangeCheck(1, two_percent);
				current_moved_sands += two_percent;
				MoveSand(8, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(6, one_percent);
				current_moved_sands += one_percent;
				MoveSandRangeCheck(11, A[r][c] - current_moved_sands);
				break;
		}
		A[r][c] = 0;
		
		// go to next movement
		//Print();
	}
}