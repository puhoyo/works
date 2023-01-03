#pragma comment(lib, "Ws2_32.lib")
#include <stdio.h>
#include <iostream>
#include <stdlib.h>
#include <Ws2tcpip.h>
#include <vector>
#include <string>
#include <thread>
#include <random>

#define BUF_SIZE 1024
typedef int num_size;
void ErrorHandling(const char*);
int ReceiveMessageThread(const SOCKET, const bool);
int SendMessageThreadBot(const SOCKET, const std::string, const int);
int SendMessageThread(const SOCKET);

int main(int argc, char* argv[]) {
	WSADATA wsaData;

	if (argc != 4) {
		printf("Usage: %s <IP> <port> <client count>\n", argv[0]);
		exit(1);
	}
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) ErrorHandling("WSAStatup() error!");

	int client_count = atoi(argv[3]);

	if (client_count < 1 || client_count > 1000) {
		ErrorHandling("client count range: 1 ~ 1000");
	}

	if (client_count > 1) {
		std::vector<std::shared_ptr<SOCKADDR_IN>> addrs;
		addrs.reserve(client_count);

		for (int i = 0; i < client_count; i++) {
			SOCKET client_socket = socket(PF_INET, SOCK_STREAM, 0);
			if (client_socket == INVALID_SOCKET) ErrorHandling("socket() error!");

			std::shared_ptr<SOCKADDR_IN> server_address = std::make_shared<SOCKADDR_IN>();
			addrs.push_back(server_address);
			memset(server_address.get(), 0, sizeof(*server_address.get()));
			server_address->sin_family = AF_INET;
			inet_pton(AF_INET, argv[1], &server_address->sin_addr.s_addr);
			//server_address->sin_addr.s_addr = inet_addr(argv[1]);
			server_address->sin_port = htons(atoi(argv[2]));

			if (connect(client_socket, reinterpret_cast<SOCKADDR*>(server_address.get()), sizeof(*server_address.get())) == SOCKET_ERROR) ErrorHandling("connect() error!");

			std::thread r(ReceiveMessageThread, client_socket, true);
			r.detach();

			std::random_device rd;
			std::mt19937 generator(rd());
			std::uniform_int_distribution distribution;

			std::string user_name("");
			int user_name_size = distribution(generator) % 3 + 2;
			for (int k = 0; k < user_name_size; k++) {
				user_name += static_cast<char>(distribution(generator) % 26 + 65);
			}
			int sending_period = distribution(generator) % 2901 + 1500;
			std::thread s(SendMessageThreadBot, client_socket, user_name, sending_period);
			s.detach();
			Sleep(5);
		}
	}
	else {
		SOCKET client_socket = socket(PF_INET, SOCK_STREAM, 0);
		if (client_socket == INVALID_SOCKET) ErrorHandling("socket() error!");

		std::shared_ptr<SOCKADDR_IN> server_address = std::make_shared<SOCKADDR_IN>();
		memset(server_address.get(), 0, sizeof(*server_address.get()));
		server_address->sin_family = AF_INET;
		inet_pton(AF_INET, argv[1], &server_address->sin_addr.s_addr);
		//server_address->sin_addr.s_addr = inet_addr(argv[1]);
		server_address->sin_port = htons(atoi(argv[2]));

		if (connect(client_socket, reinterpret_cast<SOCKADDR*>(server_address.get()), sizeof(*server_address.get())) == SOCKET_ERROR) ErrorHandling("connect() error!");

		std::thread r(ReceiveMessageThread, client_socket, false);
		r.detach();

		std::thread s(SendMessageThread, client_socket);
		s.detach();
		Sleep(5);
	}
	puts("client creation done");

	Sleep(1000000000);

	WSACleanup();
	return 0;
}

void ErrorHandling(const char* message) {
	fputs(message, stderr);
	fputc('\n', stderr);
	exit(1);
}

enum { packet_data_size = 128 };
struct Packet {
	char protocol;
	char data[packet_data_size];
};
bool SendBot(SOCKET, const char*, Packet&);
bool Send(SOCKET, char*, Packet&);
int SendMessageThreadBot(const SOCKET socket, const std::string user_name, const int sending_period) {
	//char msg[BUF_SIZE];
	Packet packet;
	memset(&packet, 0, sizeof(Packet));

	packet.protocol = 1;
	SendBot(socket, user_name.c_str(), packet);
	Sleep(2000);

	packet.protocol = 2;
	while (SendBot(socket, "test", packet)) {
		Sleep(sending_period);
	}

	return 0;
}
int SendMessageThread(const SOCKET socket) {
	char msg[BUF_SIZE];
	Packet packet;
	memset(&packet, 0, sizeof(Packet));

	packet.protocol = 1;
	Send(socket, msg, packet);

	packet.protocol = 2;
	while (Send(socket, msg, packet)) {

	}

	return 0;
}
int ReceiveMessageThread(const SOCKET socket, const bool bot) {
	char receive_data[BUF_SIZE];
	while (1) {
		int str_len = recv(socket, receive_data, BUF_SIZE - 1, 0);
		if (str_len == -1) {
			return -1;
		}

		if (!bot) {
			receive_data[str_len] = 0;
			char protocol = receive_data[0];
			//printf("protocol: %d\n", protocol);

			if (protocol == 1) {
				std::cout << "<" << &receive_data[1] << "> is logged in to server" << std::endl;
			}
			else {
				fputs(&receive_data[1], stdout);
				std::cout << std::endl;
			}
		}
	}
}

bool SendBot(SOCKET socket, const char* msg, Packet& packet) {
	//fgets(msg, BUF_SIZE, stdin);
	//msg[strlen(msg) - 1] = 0;
	//puts("send client==============");
	if (!strcmp(msg, "q") || !strcmp(msg, "Q")) {
		closesocket(socket);
		return false;
	}
	strcpy_s(packet.data, sizeof(packet.data), msg);
	char send_data[sizeof(Packet)];
	memcpy(send_data, &packet, sizeof(Packet));
	send(socket, send_data, sizeof(char) + strlen(packet.data), 0);

	return true;
}
bool Send(SOCKET socket, char* msg, Packet& packet) {
	fgets(msg, BUF_SIZE, stdin);
	msg[strlen(msg) - 1] = 0;
	//puts("send client==============");
	if (!strcmp(msg, "q") || !strcmp(msg, "Q")) {
		closesocket(socket);
		return false;
	}
	strcpy_s(packet.data, sizeof(packet.data), msg);
	char send_data[sizeof(Packet)];
	memcpy(send_data, &packet, sizeof(Packet));
	send(socket, send_data, sizeof(char) + strlen(packet.data), 0);

	return true;
}