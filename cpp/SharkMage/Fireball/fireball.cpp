// 4 <= N <= 50 격자
// 0 <= M <= N'2 개수
// 1 <= K <= 1000 이동 명령 횟수
// 1 <= ri, ci <= N 위치
// 1 <= mi <= 1000 질량
// 1 <= si <= 1000 속력
// 0 <= di <= 7 방향

// 이동 후 2개 이상일 경우
// 질량 = floor 합 / 5 (0되면 소멸)
// 속력 = floor 합 / 합쳐진 개수
// 방향 = 합쳐진 것들의 방향이 모두 홀수 or 모두 짝수 -> 0, 2, 4, 6 else 1, 3, 5, 7

// K번 이동 명령 후 남아있는것들의 질량 합

// N M K
// r c m s d

#include <iostream>
#include <cstring>

enum class Direction { kN, kNE, kE, kSE, kS, kSW, kW, kNW };

int N;
int M;
int K;

struct Point {
	int x;
	int y;
};

struct Fireball {
	Point p;
	int m;
	int d;
	int s;
	void Move() {
		switch(d) {
			case 0:
				p.x -= s;
				if(p.x < 0) {
					p.x = N - (-p.x % N);
				}
				break;
			case 1:
				p.x -= s;
				if(p.x < 0) {
					p.x = N - (-p.x % N);
				}
				p.y += s;
				if(p.y > N - 1) {
					p.y = p.y % N;
				}
				break;
			case 2:
				p.y += s;
				if(p.y > N - 1) {
					p.y = p.y % N;
				}
				break;
			case 3:
				p.x += s;
				if(p.x > N - 1) {
					p.x = p.x % N;
				}
				p.y += s;
				if(p.y > N - 1) {
					p.y = p.y % N;
				}
				break;
			case 4:
				p.x += s;
				if(p.x > N - 1) {
					p.x = p.x % N;
				}
				break;
			case 5:
				p.x += s;
				if(p.x > N - 1) {
					p.x = p.x % N;
				}
				p.y -= s;
				if(p.y < 0) {
					p.y = N - (-p.y % N);
				}
				break;
			case 6:
				p.y -= s;
				if(p.y < 0) {
					p.y = N - (-p.y % N);
				}
				break;
			case 7:
				p.x -= s;
				if(p.x < 0) {
					p.x = N - (-p.x % N);
				}
				p.y -= s;
				if(p.y < 0) {
					p.y = N - (-p.y % N);
				}
				break;
		}
	}
};

struct Tile {
	int num_fireballs;
	int m_acc;
	int s_acc;
	int last_direction;
	bool is_odd_direction;
};

int num_fireballs;
Tile map[50][50];
Fireball fireballs[10000];

void Print() {
	for(int r = 0; r < N; r++) {
		for(int c = 0; c < N; c++) {
			std::cout << map[r][c].num_fireballs << "  ";
		}
		std::cout << std::endl;
		std::cout << std::endl;
	}
}
int main() {
	std::cin >> N >> M >> K;
	
	for(int i = 0; i < M; i++) {
		std::cin >> fireballs[i].p.x >> fireballs[i].p.y >> fireballs[i].m >> fireballs[i].s >> fireballs[i].d;
        fireballs[i].p.x--;
        fireballs[i].p.y--;
	}
	num_fireballs = M;
	
	for(int i = 0; i < K; i++) {
		// reset map
		memset(map, 0, sizeof(Tile) * 2500);
		
		// step 1: move all fireballs
		for(int k = 0; k < num_fireballs; k++) {
			fireballs[k].Move();
			Tile& tile = map[fireballs[k].p.x][fireballs[k].p.y];
			tile.num_fireballs++;
			tile.m_acc += fireballs[k].m;
			tile.s_acc += fireballs[k].s;
			if(tile.num_fireballs > 1 && !tile.is_odd_direction) {
				if((fireballs[k].d - tile.last_direction) % 2 == 0) {
					// both even or both odd
				}
				else {
					// different number type
					tile.is_odd_direction = true;
				}
			}
			tile.last_direction = fireballs[k].d;
		}
		
		std::cout << i+1 << " move complete" << std::endl;
		Print();
		// step 2: generate new fireballs from map
		int f = 0;
		for(int r = 0; r < N; r++) {
			for(int c = 0; c < N; c++) {
				Tile& tile = map[r][c];
				if(tile.num_fireballs == 1) {
					Fireball& fireball = fireballs[f++];
					fireball.p.x = r;
					fireball.p.y = c;
					fireball.m = tile.m_acc;
					fireball.d = tile.last_direction;
					fireball.s = tile.s_acc;
				}
				else if(tile.num_fireballs > 1) {
					// combine fireballs
					int m = tile.m_acc / 5;
					if(m > 0) {
						int s = tile.s_acc / tile.num_fireballs;
						for(int k = 0; k < 4; k++) {
							Fireball& fireball = fireballs[f++];
							fireball.p.x = r;
							fireball.p.y = c;
							fireball.m = m;
							fireball.s = s;
							fireball.d = tile.is_odd_direction ? k * 2 + 1 : k * 2;
						}
					}
				}
			}
		}
		
		num_fireballs = f;
	}
	
	
	int sum = 0;
	for(int i = 0; i < num_fireballs; i++) {
		sum += fireballs[i].m;
	}
	std::cout << sum << std::endl;
}